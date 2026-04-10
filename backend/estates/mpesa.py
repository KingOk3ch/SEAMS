import os
import requests
import base64
from datetime import datetime
from django.conf import settings

def get_mpesa_access_token():
    consumer_key = os.getenv('MPESA_CONSUMER_KEY')
    consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
    
    # In a real environment, you'd cache the token until it expires
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        response = requests.get(api_url, auth=(consumer_key, consumer_secret), timeout=10)
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        print(f"Error getting Mpesa access token: {e}")
        return None

def initiate_stk_push(phone_number, amount, reference, description="Payment"):
    """
    phone_number: format 2547XXXXXXXX
    """
    access_token = get_mpesa_access_token()
    if not access_token:
        return {"error": "Failed to get access token"}
        
    api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    passkey = os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')
    shortcode = os.getenv('MPESA_SHORTCODE', '174379')
    
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password_str = shortcode + passkey + timestamp
    password = base64.b64encode(password_str.encode()).decode('utf-8')
    
    # Callback URL needs to be publicly accessible. For local testing with sandbox, 
    # it often needs to be a ngrok URL or similar.
    # We will fetch it from .env
    callback_url = os.getenv('MPESA_CALLBACK_URL', 'https://mydomain.com/api/payments/mpesa/callback/')
    
    # Format phone number, Safaricom requires 254... format.
    # Convert 07... or 01... or +254... to 254...
    if phone_number.startswith('+'):
        phone_number = phone_number[1:]
    if phone_number.startswith('0'):
        phone_number = '254' + phone_number[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(float(amount)),
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": reference[:12],
        "TransactionDesc": description[:13]
    }
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"STK Push Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            return {"error": str(e), "details": e.response.text}
        return {"error": str(e)}

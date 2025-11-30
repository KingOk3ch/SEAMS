# SEAMS - Smart Estates Administration and Maintenance System

![SEAMS Banner](https://img.shields.io/badge/SEAMS-Estate%20Management-5C7E6D?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)
![Django](https://img.shields.io/badge/Django-REST-092E20?style=flat-square&logo=django)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)
![Material-UI](https://img.shields.io/badge/Material--UI-5.x-007FFF?style=flat-square&logo=mui)

## 📋 Overview

SEAMS (Smart Estates Administration and Maintenance System) is a comprehensive web-based platform designed to streamline the management of employee housing estates. The system handles housing allocation, maintenance requests, tenant management, and generates insightful reports for estate administrators.

### ✨ Key Features

- **🏠 Housing Management**: Real-time inventory tracking, allocation workflows, and occupancy monitoring
- **🔧 Digital Maintenance System**: Streamlined request submission, technician assignment, and progress tracking
- **👥 Tenant Management**: Complete tenant lifecycle management with contract tracking
- **📊 Analytics & Reporting**: Comprehensive reports on occupancy, maintenance, and financials
- **🎨 Modern UI/UX**: Beautiful sage green and terracotta color scheme with light/dark mode
- **🔐 Role-Based Access**: Secure authentication with JWT and role-specific dashboards
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js 18.x
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Backend
- **Framework**: Django 4.x
- **API**: Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Media Storage**: Local filesystem

### Design System
- **Primary Color**: Sage Green (#5C7E6D)
- **Secondary Color**: Terracotta (#C46A4C)
- **Typography**: Roboto (Material-UI default)

---

## 📂 Project Structure
```
SEAMS/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Layout.js
│   │   │   ├── Navbar.js
│   │   │   ├── Sidebar.js
│   │   │   └── StatsCard.js
│   │   ├── pages/           # Page components
│   │   │   ├── DashboardPage.js
│   │   │   ├── HousingPage.js
│   │   │   ├── MaintenancePage.js
│   │   │   ├── TenantsPage.js
│   │   │   ├── ReportsPage.js
│   │   │   └── LoginPage.js
│   │   ├── context/         # React contexts
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── services/        # API service layer
│   │   │   └── api.js
│   │   ├── theme/           # MUI theme configuration
│   │   │   └── theme.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── backend/                 # Django Backend (Coming Soon)
    ├── estates/             # Main app
    ├── users/               # User management
    ├── maintenance/         # Maintenance module
    └── manage.py
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Python**: 3.9+ (for backend)
- **PostgreSQL**: 13+ (for backend)

### Frontend Setup

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/SEAMS.git
   cd SEAMS/frontend
```

2. **Install dependencies**
```bash
   npm install
```

3. **Start development server**
```bash
   npm start
```

4. **Open your browser**
   Navigate to `http://localhost:3000`

5. **Demo Login**
   - Use any username and password to login (demo mode)

### Backend Setup (Coming Soon)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## 📱 Features Breakdown

### 1. Dashboard
- Real-time occupancy statistics
- Pending maintenance overview
- Recent activity feed
- Quick action buttons
- System notifications

### 2. Housing Management
- House inventory with filtering
- Occupancy status tracking
- Allocation workflows
- House details and history

### 3. Maintenance System
- Digital request submission
- Priority-based categorization
- Technician assignment
- Status tracking (Pending → Assigned → In Progress → Completed)
- Image upload capability (future)

### 4. Tenant Management
- Comprehensive tenant profiles
- Contract lifecycle management
- Move-in/move-out tracking
- Contract expiry alerts

### 5. Reports & Analytics
- Occupancy trends
- Maintenance statistics by category
- Financial summaries
- Export to Excel/PDF (future)

---

## 🎨 Design Philosophy

SEAMS uses a carefully crafted design system inspired by nature and warmth:

- **Sage Green (#5C7E6D)**: Primary color representing growth and stability
- **Terracotta (#C46A4C)**: Accent color adding warmth and approachability
- **Interactive States**: Smooth transitions with scale transforms on hover
- **Accessibility**: WCAG 2.1 AA compliant with proper contrast ratios

---

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Protected API routes
- Secure password handling
- CSRF protection (Django)

---

## 🗺️ Roadmap

### Phase 1: Frontend (✅ Completed)
- [x] Authentication system
- [x] Dashboard with analytics
- [x] Housing management UI
- [x] Maintenance module UI
- [x] Tenant management UI
- [x] Reports interface
- [x] Light/Dark mode toggle

### Phase 2: Backend (🚧 In Progress)
- [ ] Django project setup
- [ ] Database models
- [ ] REST API endpoints
- [ ] JWT authentication
- [ ] File upload handling
- [ ] Report generation

### Phase 3: Integration (⏳ Planned)
- [ ] Connect frontend to backend APIs
- [ ] Real-time data synchronization
- [ ] Form validations
- [ ] Error handling
- [ ] Loading states

### Phase 4: Advanced Features (⏳ Planned)
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Document generation (PDF reports)
- [ ] Advanced search and filtering
- [ ] Data export (Excel, CSV)
- [ ] Audit logs

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- Material-UI for the excellent component library
- React community for amazing tools and resources
- Django REST Framework for robust API development

---

## 📧 Contact

**Project Maintainer**: Your Name  
**Email**: your.email@example.com  
**Project Link**: [https://github.com/yourusername/SEAMS](https://github.com/yourusername/SEAMS)

---

## 📸 Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Housing Management
![Housing](screenshots/housing.png)

### Maintenance System
![Maintenance](screenshots/maintenance.png)

---

**Built with ❤️ for efficient estate management**

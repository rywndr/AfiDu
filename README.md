# 🎓 AfiDu - Student Management System for an English Learning Center

![AfiDu Logo]()

## 📋 Overview

AfiDu is a student data management system designed for an English tutorial center (known as "BIMBEL" in Indonesia). This app simplifies student management, score tracking, payment processing, and study material organization for English learning center.

## ✨ Stuff you can do

### 👨‍🎓 Student Management

- Add, edit, and delete student records
- Assign students to specific levels or classes
- Configure classes and levels
- Advanced filtering options for quick student lookup

### 📊 Score Tracking

- Record student scores by year, semester, and category
- Configure unique scoring systems based on your needs
- Customize formulas for calculating final scores
- Real-time score calculation
- Filtering options for easy data access

### 📚 Study Materials

- Upload PDF study materials
- View and edit material names and categories
- Filter materials by category
- Document preview functionality

### 📝 Reports

- Generate individual student reports
- Export all reports as ZIP based on applied filters
- Comprehensive score reporting from the score tracking system

### 💰 Payment Management

- Configure monthly fees
- Set mid-semester and final semester payment periods
- Detailed payment summaries showing:
  - Total due amount
  - Total paid amount
  - Remaining balance
  - Monthly payment status
- Configure payment settings by year and semester
- Install payments in multiple transactions

### 👥 User Roles

- **Teacher**: Access to the app
- **Superuser**: Full access including admin page and ability to create new accounts

## 🛠️ Tech Used

- **Framework**: Django
- **Frontend**:
  - Tailwind - Utility first css framework
  - FontAwesome - Icon library
- **Database**: PostgreSQL (using NeonDB)/SQLite (optional)
- **Email**: Custom email backend for password reset link

## 🖼️ UI

<sub><sup>UI screenshot coming soon<sub><sup>

## 🎬 Demo

<sub><sup>video demo coming soon<sub><sup>

## ⚙️ Installation & Setup

### Prerequisites

1.  Python 3.8+
2.  Node.js and npm
3.  Poppler (for generating study materials thumbnail)
4.  Git

### Installing Poppler

#### Windows

```bash
# Using Chocolatey
choco install poppler

# OR download the latest build from from: https://github.com/oschwartz10612/poppler-windows/releases
# Add the bin directory to your PATH environment variable

```

#### macOS

```bash
# Using Homebrew
brew install poppler

```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### Setting up the Project

1.  **Clone the repository**

    ```bash
    git clone https://github.com/rywndr/afidu.git
    cd afidu
    ```

2.  **Create and activate a virtual environment**

    ```bash
    python -m venv .venv

    # On Windows
    .venv\Scripts\activate

    # On macOS/Linux
    source .venv/bin/activate
    ```

3.  **Install Python dependencies**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Install Node.js dependencies**

    ```bash
    npm install
    ```

5.  **Set up environment variables**

    ```bash
    # Copy example environment file
    cp .env.example .env

    # Edit the .env file with your database credentials and other settings
    ```

6.  **Run database migrations**

    ```bash
    python manage.py migrate
    ```

7.  **Create a superuser**

    ```bash
    python manage.py createsuperuser
    ```

### Running the app

You need to run both the Django development server and the Tailwind CSS compiler in separate terminal windows:

**Terminal 1 - Run Tailwind CSS compiler:**

```bash
npx tailwindcss -i ./static/src/input.css -o ./static/src/output.css --watch
```

**Terminal 2 - Run Django server:**

```bash
python manage.py runserver
```

Then visit `http://127.0.0.1:8000` in your browser to access the app.

## 📄 License

[MIT License]()

## 👨‍💻 Contributors

- [Haikhal Roywendra](https://github.com/rywndr)
- [Mizu](https://github.com/Miizzuuu)

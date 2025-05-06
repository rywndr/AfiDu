# AfiDu - student management system for an english learning center

<p align="center">
  <img src="./src/static/images/afidu.png" alt="AfiDu Logo" width="101" height="154" />
</p>

## 📋 overview

AfiDu is a student data management system designed for an English tutorial center (known as "BIMBEL" in Indonesia). This app simplifies student management, score tracking, payment processing, and study material organization for English learning center.

## ✨ stuff you can do

### 👨‍🎓 student management

- add, edit, and delete student records
- assign students to specific levels or classes
- configure classes and levels
- advanced filtering options for quick student lookup

### 📊 score tracking

- record student scores by year, semester, and category
- configure unique scoring systems based on your needs
- customize formulas for calculating final scores
- real-time score calculation
- filtering options for easy data access

### 📚 study materials

- upload pdf study materials
- view and edit material names and categories
- filter materials by category
- document preview functionality

### 📝 reports

- generate individual student reports
- export all reports as zip based on applied filters
- comprehensive score reporting from the score tracking system

### 💰 payment management

- configure monthly fees
- set mid-semester and final semester payment periods
- detailed payment summaries showing:
  - total due amount
  - total paid amount
  - remaining balance
  - monthly payment status
- configure payment settings by year
- install payments in multiple transactions

### 📝 reports

- generate individual student reports
- export all reports as zip based on applied filters
- comprehensive score reporting from the score tracking system
- download various document types:
  - student registration forms
  - payment cards
  - configurable student lists (PDF/Excel)
  - detailed payment reports with filtering options
  - comprehensive student summaries with academic and payment information

### 👥 user roles

- **teacher**: access to the app
- **superuser**: full access including admin page and ability to create new accounts

## 🛠️ tech used

- **framework**: django
- **frontend**:
  - tailwind - utility first css framework
  - fontAwesome - icon library
- **database**: postgresql (using neondb)/sqlite (optional)
- **email**: custom email backend for password reset link (optimized for use locally)

## 🖼️ ui

<sub><sup>ui screenshot coming soon<sub><sup>

## 🎬 demo

<sub><sup>video demo coming soon<sub><sup>

## ⚙️ installation & setup

### prerequisites

1.  python 3.8+
2.  node.js and npm
3.  poppler (for generating study materials thumbnail)
4.  git

### installing poppler

#### windows

```bash
# using chocolatey
choco install poppler

# or download the latest build from from: https://github.com/oschwartz10612/poppler-windows/releases
# add the bin directory to your path environment variable

```

#### macOS

```bash
# using homebrew
brew install poppler

```

#### linux (ubuntu/debian)

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### setting up the Project

1.  **clone the repository**

    ```bash
    git clone https://github.com/rywndr/afidu.git
    cd afidu
    ```

2.  **create and activate a virtual environment**

    ```bash
    python -m venv .venv

    # on windows
    .venv\Scripts\activate

    # on macos/linux
    source .venv/bin/activate
    ```

3.  **install python dependencies**

    ```bash
    pip install -r requirements.txt
    ```

4.  **install node.js dependencies**

    ```bash
    npm install
    ```

5.  **set up environment variables**

    ```bash
    # copy .env.example to .env

    cp .env.example .env

    # edit the .env file with your database credentials and other settings
    ```

6.  **run database migrations**

    ```bash
    python manage.py migrate
    ```

7.  **create a superuser**

    ```bash
    python manage.py createsuperuser
    ```

### run the app

you need to run both the django development server and the tailwind css compiler in separate terminal windows:

**terminal 1 - run tailwind css compiler:**

```bash
npx tailwindcss -i ./static/src/input.css -o ./static/src/output.css --watch
```

**terminal 2 - run django server:**

```bash
python manage.py runserver
```

then visit `http://127.0.0.1:8000` in your browser to access the app.

## 🎨 color palette

| color   | hex code  | preview                                                                               |
| ------- | --------- | ------------------------------------------------------------------------------------- |
| primary | `#ff4f25` | ![](https://img.shields.io/badge/-_-ff4f25?style=flat&labelColor=ff4f25&color=ff4f25) |
| shade1  | `#cc3f1e` | ![](https://img.shields.io/badge/-_-cc3f1e?style=flat&labelColor=cc3f1e&color=cc3f1e) |
| shade2  | `#b3371a` | ![](https://img.shields.io/badge/-_-b3371a?style=flat&labelColor=b3371a&color=b3371a) |
| grey    | `#5a5656` | ![](https://img.shields.io/badge/-_-5a5656?style=flat&labelColor=5a5656&color=5a5656) |

## 📄 license

[mit license](./LICENSE)

## 👨‍💻 contributors

- [sudo](https://github.com/rywndr)
- [mizu](https://github.com/Miizzuuu)

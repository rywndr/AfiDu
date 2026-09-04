# AfiDu - An internal management system and a simple E-Learning app

AfiDu started as a college Practical Work (Kerja Praktek) project. The goal was to design and
develop a system or basically Systems Development Project for a private English learning center called **Bimbel Arifiana**. The project was later expanded with an e-learning app as part of @[Miizzuuu](https://github.com/Miizzuuu)'s undergrad work. Since most of the development was originally carried out by the two of us, I'm mainly helping with dev work and integration for the e-learning app.

The system was designed to simplify the handling of management work for the learning center, mainly because 100% of the workflow of the learning center were handled manually, i.e., student management, score tracking, payment processing, study modules, and student report cards. Which furthermore is supported by the E-Learning app by enabling students to view study modules and work on their assignments from home, not bound to attend class.

## The tech used

AfiDu's internal management system was originally made fully with **Django**, for the backend and frontend work, it is supposed to only be locally hosted by the learning center, because its intended users are only the teachers. While the E-Learning app is made with **Next.js** and is intended to be hosted.

Both apps use **Tailwind** as the CSS framework and both share the same **PostgreSQL** database that is hosted on **NeonDB**. The two apps never communicate with each other through HTTP or API whatsoever. They operate independently by their framework and indirectly communicate via reading and writing to the same db instance. 

The Next app also uses **Drizzle** as the ORM of choice, **shadcn** as the component library, **better-auth** for RBAC, **Backblaze B2** for object storage, and **RHF + Zod** for form and validation handling. That's about it.

## Setting up the Django app

To run the Django app, you need to have these programs installed:

1. Python 3.8+
2. Node.js (or any other JavaScript runtime of choice)

Then, clone the repo
```bash
git clone https://github.com/rywndr/afidu.git
```

Create a Python venv inside said repo
```bash
python -m venv .venv

# on Windows
.venv\Scripts\activate

# on Windows but Git Bash
source .venv/Scripts/activate

# on macOS/linux
source .venv/bin/activate
```

Install Python dependencies
```bash
pip install -r requirements.txt
```

Install Node dependencies (for the Django app, because we're using tailwind)
```bash
npm install
```

Set up environment variables and edit them accordingly
```bash
cp .env.example .env
```

Run the migrate command inside `src`
```bash
python manage.py migrate
```

And finally, create a superuser for the Django app
```bash
python manage.py createsuperuser
```

Now to run the actual Django app, you'd need two terminal windows open. One for the Tailwind compiler and the other for the dev server.

Terminal 1 (Tailwind compiler)
```bash
npx tailwindcss -i ./src/static/src/input.css -o ./src/static/src/output.css --watch
```

Terminal 2 (dev server)
```bash
python manage.py runserver
```

The app should be ready at `http://127.0.0.1:8000` to be accessed from the browser.

## Setting up the Next app

cd into the e-learning directory from the root directory `cd e-learning` and the process is pretty similar as setting up the Django app

First, install the Node dependencies
```bash
npm install
```

Then, set up your environment variables
```bash
cp .env.example .env
```

And finally, start the dev server
```bash
npm run dev
```

We're done!

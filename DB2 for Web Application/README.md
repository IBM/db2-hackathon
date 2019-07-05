Overview of DB2 NodeJS Mock Webstore Sample

IBM® DB2 NodeJS Mock Webstore simulates dozens or hunderds of user making online orders separately at the same time, and includes supporting quantities of queries through two connection pools connecting with Db2.

This demo is a simple implementation of an application based on Node.js runtime environment, demonstrating how Node.js applications connect to Db2. It includes examples of running both regular SQL statements as well as JSON capabilities.

Prerequisite
Requires NodeJS version later than 6.2.0
Please download node.js and install it on your local machine. Use the latest LTS build from the https://nodejs.org/en/download/ website.

Requires Db2 version 11.1.2.2

DISCLAIMER:
Web app creates multiple connections to the database to demonstrate pooling therefore Db2 On Cloud LITE version will not work since it will limit the number of connections.


Installing up the app

1.  Clone the app to your local environment from your terminal using the following command:

    git clone https://github.com/DB2-Samples/db2nodejs.git

2.  `cd` into this newly created directory
3.  Install the required npm and bower packages using the following command

    npm install


Setting up the database

    Please create a database for this demo app.


Setting up the app
Start your app locally with the following command

    npm run start

Start your app locally in odbc debug mode with the following command

    npm run debug

The app will be launched at http://localhost:8888/




Db2 NodeJS Mock Webstore contains such functions as
user management, Db2 connection management and mock workload.

1.  Sign In/Sign Up - User Management

When first accessing to this site, it will direct to the login page, providing services of user registration and authentication.

    All the user information will be stored in /src/app/config/user.json


2.  Db2 connection management

It will redirect to the control page after signing in, allowing end users connect specified database to load/clear mock data

    src/app/utils/DDL.js contains the DDL for certain table needed by this demo application.

The application will create one schema named WEBSTORE and four table WEBSTORE.CUSTOMER, WEBSTORE.INVENTORY, WEBSTORE.WEBSALES, WEBSTORE.TESTJSON.


3.    Mock Workload

Demo workload will be controlled by three arguments.

Limit for Purchasing pool - Max connection size for purchasing pool

Limit for customer service pool - Max connection size for customer service pool

Parrallel user number - The number indicates the user number of one polling period.


The mock workloads simulate continuous user behaviours, deviding into three types:

Type 1

    User will browse the inventory table and decide whether to make a order.

Type 2

    User will come to alter his previous order.

Type 3

    User will send JSON query through connection pool.


The parallel user number and polling cycle timeout will impact the workload pressure.
polling cycle timeout has been set as hard code at src/app/utils/UserLoad.js (line 4-5)

For front-end effect smoothness, we recommend the ratio of parallel user number to average polling cycle length less than 40/second, or the front end page may encounter critical performance issue.

All the source code are under folder

    `src/app/build - contains front end dependencied js code.`

    `src/app/utils - contains back end code.`

    `src/app/index.html - login page`

    `src/app/index.js - startup js file`

    `src/app/user.hbs - user control page.`

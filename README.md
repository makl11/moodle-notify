# Moodle-Notify

## Installation

The project currently expects typescript to be installed globally.\
You will also need to have [Chrome Web Browser](https://www.google.com/chrome/) and [Selenium Chrome Driver](https://chromedriver.chromium.org/downloads) installed on your system.

Also install the projects other dependencies using `npm install -D`

## Usage

Provide required environment variables:

-   `MOODLE_NOTIFY_USERNAME`
-   `MOODLE_NOTIFY_PASSWORD`

Start the script with the following command: `npm run start`

## Todo

-   [ ] remove selenium for login
-   [ ] diff course content with previos content
-   [ ] notify on change
-   [x] fetch all course data
-   [x] login using selenium

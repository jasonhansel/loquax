# Loquax

Loquax is an online Latin dictionary that supports adding flashcards.
It is currently [available online](https://jasonhansel.com/loquax).
It was last updated in 2014; since I have begun to focus on other projects,
I have decided to make it open-source (see LICENSE for details).

The code is undocumented at present, and some dependencies may be out of date.
The dictionary entries are supplied by Lewis's "An Elementary Latin Dictonary"
and by Whitaker's Words. Flashcards are supported through Quizlet's API.

## Installation
1. Clone the repository and run "npm install" to get dependencies
2. Adjust the configuration in "config/local.json"
3. Run "node app.js" to start the application, which will listen on port 3000

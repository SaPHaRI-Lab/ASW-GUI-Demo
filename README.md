# Affect Sensing Wearable GUI
This is the graphical user interface (GUI) to be used in the ASW user study. The goal is for participants to utilize the GUI to design different actuation methods for a wearable after watching an emotion-eliciting video. There are customizable options that show different actuation methods to convey various interpretations of emotions.
## Instructions to run the GUI
1. Install Node.js (including npm) from this link: https://nodejs.org/en or check if they're already installed through typing "node -v" and "npm -v" in your terminal
2. Make sure you are in the correct directory (asw-current) in your terminal or navigate to it if not: cd asw-current
3. Type "npm install express" in your terminal
4. Type "npm install express multer sqlite3 fs" in your terminal
5. Run the server by typing "node server.js" in your terminal
6. When you see this message "Server is running on http://localhost:3000" in your terminal, paste this link into your web browser to get to the GUI: http://localhost:3000

*If these steps don't work to run the GUI, drag the "index.html" file onto your desktop and double click on it to open it in your browser

## Instructions to see saved files
1. To see the files, go to http://localhost:3000/files
2. To view the files in a dashboard format and delete or download files, go to http://localhost:3000/ASWGUIdash
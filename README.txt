CHOCO'S BOMBPARTY - how to put it online (free, no coding)

You need two free accounts: GitHub (stores the files) and Render (runs the game).

STEP 1 - Put the files on GitHub
1. Unzip this folder on your computer.
2. Sign up at github.com, then click "New repository". Name it chocos-bombparty, keep it Public, click Create.
3. On the new repo page click "uploading an existing file".
4. Drag EVERYTHING from inside the unzipped folder into the page: server.js, package.json,
   words.txt, syl.txt, README.txt and the "public" folder. (package.json must sit at the top
   level of the repo, and public/index.html must show up inside the public folder.)
5. Click "Commit changes".

STEP 2 - Run it on Render
1. Sign up at render.com (you can use your GitHub login).
2. Click New > Web Service, and pick your chocos-bombparty repo.
3. Set: Runtime = Node, Build Command = npm install, Start Command = npm start, Instance Type = Free.
4. Click Create Web Service and wait a few minutes until it says Live.
5. Render gives you a link like https://chocos-bombparty.onrender.com . Send that to anyone. 

NOTES
- Free Render services go to sleep after 15 minutes with no traffic. The first visit after
  that takes about a minute to wake up. Active games keep it awake.
- Lobbies and chat live in memory, so they reset whenever the server restarts.
- Chat has no swear filter. It does limit message length and speed.
- To test on your own computer instead: install Node.js, open a terminal in this folder,
  run "npm install" then "npm start", and visit http://localhost:3000

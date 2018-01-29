// set up ========================
var express = require('express');
var app = express();                               // create our app w/ express
var path = require("path");
var logger = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var cookieParser = require('cookie-parser');
var request = require("request");

var index = require("./routes/index");
var login = require("./routes/login");
var personal = require("./routes/personal");
var playlist = require("./routes/playlist");

// configuration =================
app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
app.use(logger('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({extended: false}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(cookieParser());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use("/", index);
app.use("/login", login);
app.use("/me", personal);
app.use("/playlist", playlist);

function refresh(req, fn) {
    request.post('https://accounts.spotify.com/api/token', {
        form: {
            code: req.param("refresh"),
            grant_type: "authorization_code",
            redirect_uri: process.env.redirect
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64')
        }
    }, function (err, resp, body) {
        var auth = JSON.parse(body);

        resp.cookie("auth", auth.access_token);
        resp.cookie("refresh", auth.refresh_token);

        fn();
    }).on("error", function (err) {
        console.log("Error: " + err.message);

        fn();
    });
}

app.get("/song", function (req, res) {
    var auth = req.cookies['auth'];

    var options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth
        }
    };

    request.get('https://api.spotify.com/v1/tracks/11dFghVXANMlKmJXsNCbNl?market=ES', options, function (err, resp, body) {
        var song = JSON.parse(body);

        res.render("song", {
            song: song
        });
    }).on("error", function (err) {
        console.log("Error: " + err.message);

        res.render("song");
    });
});

app.get("/other", function (req, res) {
    var auth = req.cookies['auth'];
    var userId = req.query.user_id;

    var options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth
        }
    };

    request.get('https://api.spotify.com/v1/users/' + userId, options, function (err, resp, body) {
        var me = JSON.parse(body);

        request.get('https://api.spotify.com/v1/users/' + userId + '/playlists?limit=50', options, function (err, resp, body) {
            var playlists = JSON.parse(body);

            res.render("other", {
                other: me,
                playlists: playlists.items
            });
        }).on('error', function (err) {
            console.log("Error: " + err.message);

            res.render("other");
        });
    }).on("error", function (err) {
        console.log("Error: " + err.message);

        res.render("other");
    });
});

// listen (start app with node server.js) ======================================
app.listen(8080, '0.0.0.0');
console.log("App listening on port 8080");
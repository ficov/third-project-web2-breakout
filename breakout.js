/**
 * Canvas element u kojem se isctravaju svi vizualni elementi u igrici.
 */
const canvas = document.getElementById('breakout');
canvas.width = window.innerWidth; // postavljanje sirine canvasa na sirinu cijelog prozora preglednika
canvas.height = window.innerHeight; // postavljanje visine canvasa na visinu cijelog prozora preglednika
const ctx = canvas.getContext('2d'); // inicializacija 2d konteksta


/**
 * Objekt koji predstavlja lopticu.
 * Sadrži x i y (koordinate loptice), dx i dy (brzina loptice), radijus loptice, boju loptice.
 */
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    dx: 0,
    dy: 0,
    radius: 20,
    color: 'green'
};

/**
 * Objekt koji predstavlja palicu.
 * Sadrži visinu, širinu, x koordinatu, boju palice.
 */
const paddle = {
    height: 15,
    width: 350,
    x: (canvas.width - 350) / 2,
    color: '#0095DD'
};

/**
 * Objekt koji predstavlja osnovne elemente vezane uz cigle u igrici.
 * Sadrži broj redova i stupaca cigli, širinu i visinu cigle, padding, udaljenost cigli od vrha i lijevog ruba te boju cigle.
 */
const brickConfig = {
    rowCount: 3,
    columnCount: 3,
    width: 773,
    height: 80,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 29,
    color: 'orange'
};

/**
 * Dvodimenzionalno polje koje predstavlja cigle u igrici.
 * Cigle su predstavljene objektima koji sadrže x i y koordinate te status (1 - prikazana, 0 - uništena).
 */
const bricks = [];
// inicijalizacija dvodimenzionalnog polja koji predstavlja cigle
for (let c = 0; c < brickConfig.columnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickConfig.rowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}

/**
 * Objekt koji predstavlja smjer u kojem je pritisnuta tipka (koristi se za pomicanje palice).
 */
const pressedDirection = {
    right: false,
    left: false
};

/**
 * Broj bodova igrača u igrici, odnosno broj uništenih cigli.
 */
let score = 0;

/**
 * Varijabla u koju se sprema instanca funkcije setInterval() kako bi se zadani interval mogao kasnije obrisati.
 * Koristi se za izvođenje funkcije draw() svakih 10 ms.
 */
let interval = null;

/**
 * Najbolji rezultat igrača koji se sprema u local storage.
 */
let highScore = localStorage.getItem('highScore') || 0;

/**
 * Varijabla koja označava je li igra pokrenuta.
 */
let gameStarted = false;

/**
 * Funkcija za inicijalizaciju brzine i kuta kretanje loptice.
 */
function initializeBall() {
    const ballSpeed = 8;
    // postavljanje kuta kretanja loptice između 30 i 120 stupnjeva, te pretvaranje u radijane
    const minAngle = 30 * (Math.PI / 180);
    const maxAngle = 120 * (Math.PI / 180);
    const angle = Math.random() * (maxAngle - minAngle) + minAngle; // nasumični kut između 30 i 120 stupnjeva

    ball.dx = ballSpeed * Math.cos(angle); // postavljanje brzine loptice u smjeru x osi
    ball.dy = ballSpeed * Math.sin(angle); // postavljanje brzine loptice u smjeru y osi
}

/**
 * Funkcija za crtanje loptice i palice.
 */
function drawBallAndPaddle() {
    ctx.beginPath(); // postavljanje putanje
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); // izrada kruga s centrom u (ball.x, ball.y), radijusom ball.radius i kutem od 0 do 2π
    ctx.fillStyle = ball.color; // postavljanje boje loptice
    ctx.fill(); // popunjavanje kruga bojom
    ctx.closePath(); // zatvaranje putanje

    ctx.beginPath();
    // izrada pravokutnika s gornjim lijevim kutom u točki (paddle.x, canvas.height - paddle.height), širinom paddle.width, visinom paddle.height
    ctx.rect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height);
    ctx.fillStyle = 'red';
    ctx.shadowColor = 'orange'; // postavljanje boje sjene palice
    ctx.shadowBlur = 10; // postavljanje intenziteta sjene
    ctx.fill();
    ctx.shadowBlur = 0; // resetiranj intenziteta sjene kako se ne bi primjenjivao na ostale elemente
    ctx.closePath();
}

/**
 * Funkcija za crtanje cigli i prikaz bodova.
 */
function drawBricksAndScore() {
    for (let c = 0; c < brickConfig.columnCount; c++) {
        for (let r = 0; r < brickConfig.rowCount; r++) {
            const brick = bricks[c][r];
            if (brick.status === 0) { // ako je cigla uništena, preskoči
                continue;
            }
            // dobivanje koordinata cigle na temelju retka i stupca te koristenje dobivenih u funkciji rect() za crtanje pravokutnika
            const brickX = (c * (brickConfig.width + brickConfig.padding)) + brickConfig.offsetLeft;
            const brickY = (r * (brickConfig.height + brickConfig.padding)) + brickConfig.offsetTop;
            brick.x = brickX;
            brick.y = brickY;
            ctx.beginPath();
            ctx.rect(brickX, brickY, brickConfig.width, brickConfig.height);
            ctx.fillStyle = brickConfig.color;
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();

            // ispis bodova u obliku teksta
            ctx.font = '20px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'right';
            // ispis teksta u gornjem desnom kutu canvasa
            ctx.fillText(`Score: ${score}/${brickConfig.rowCount * brickConfig.columnCount}`, canvas.width - 100, 20);
            ctx.fillText(`High score: ${highScore}`, canvas.width - 100, 40);
        }
    }
}

/**
 * Funkcija za provjeru sudara loptice s ciglama.
 */
function checkBrickCollision() {
    for (let c = 0; c < brickConfig.columnCount; c++) {
        for (let r = 0; r < brickConfig.rowCount; r++) {
            const brick = bricks[c][r];
            if (brick.status === 0) { // ako je cigla uništena, preskoči
                continue;
            }
            // ako se kooridnate loptice nalaze unutar pravokutnika cigle, promijeni smjer loptice, postavi status cigle na 0 te povećaj bodove
            if (
                ball.x > brick.x &&
                ball.x < brick.x + brickConfig.width &&
                ball.y > brick.y &&
                ball.y < brick.y + brickConfig.height
            ) {
                ball.dy = -ball.dy;
                brick.status = 0;
                score++;
            }
        }
    }
}

/**
 * Objekt koji predstavlja evente vezane uz pritisak tipke tipkovnice - desna strelica, lijeva strelica i TAB.
 */
const keyBoardEvents = {
    keyDownHandler: function (e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            pressedDirection.right = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            pressedDirection.left = true;
        } else if (e.key === ' ' || e.key === 'Spacebar') { // ako je pritisnuta TAB tipka, pokreni/resetiraj igricu
            if (!gameStarted) {
                resetGame();
                interval = setInterval(draw, 10);
                gameStarted = true;
            }
        }
    },
    keyUpHandler: function (e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            pressedDirection.right = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            pressedDirection.left = false;
        }
    }
}

/**
 * Funkcija za provjeru sudara loptice sa bočnim zidovima.
 * @returns true ako je došlo do sudara
 */
function checkWallCollision() {
    // provjera nalazi li se loptica unutar zidova
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx; // ako je došlo do sudara, promijeni x smjer loptice
        return true;
    }
    return false;
}

/**
 * Funkcija za provjeru sudara loptice s gornjim zidom.
 * @returns true ako je došlo do sudara
 */
function checkCeilingCollision() {
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy; // ako je došlo do sudara, promijeni y smjer loptice
        return true;
    }
    return false;
}

/**
 * Funkcija za provjeru sudara loptice s palicom.
 * @returns true ako je došlo do sudara
 */
function checkPaddleCollision() {
    // ako je loptica došla do dna canvasa i nalazi se unutar palice, promijeni y smjer loptice
    if (ball.y + ball.dy > canvas.height - ball.radius) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
            return true;
        }
    }
    return false;
}

/**
 * Funkcija za prikazivanje poruke na ekranu.
 * @param {*} message poruka koja se prikazuje
 */
function displayMessage(message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // očisti canvas kako bi se prikazala nova poruka
    // varijable za prikazivanje više redaka teksta
    const lines = message.split('\n');
    const lineHeight = 70;
    ctx.font = '48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, canvas.height / 2 + index * lineHeight); // ispis teksta na sredini canvasa, svaki redak u novi red
    });
}

/**
 * Funkcija za ažuriranje najboljeg rezultata.
 * Rezultat se ažurira samo ako je trenutni rezultat veći od najboljeg.
 * Rezultat se sprema u local storage.
 */
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore); // postavljanje najboljeg rezultata u local storage
    }
}

/**
 * Funkcija za provjeru treba li se igra zaustaviti.
 * @returns true ako se igra zaustavila
 */
function checkGameOver() {
    // ako je loptica došla do dna canvasa i nije unutar palice, igra se treba završiti
    if (ball.y + ball.dy > canvas.height - ball.radius && !(ball.x > paddle.x && ball.x < paddle.x + paddle.width)) {
        clearInterval(interval); // zaustavi interval
        displayMessage('GAME OVER\nCLICK SPACE TO RESTART');
        updateHighScore(); // ažuriraj najbolji rezultat
        gameStarted = false; // postavi da igra nije pokrenuta
        return true;
    }
    return false;
}

/**
 * Funkcija za provjeru je li igrač pobijedio.
 * @returns true ako je došlo do pobjede
 */
function checkVictory() {
    if (score === brickConfig.rowCount * brickConfig.columnCount) {
        clearInterval(interval);
        displayMessage('YOU WIN!\nCLICK SPACE TO RESTART');
        updateHighScore();
        gameStarted = false;
        return true;
    }
    return false;
}

/**
 * Funkcija za crtanje elemenata na canvasu.
 * Ova funkcija se izvršava svakih 10 ms.
 */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height); // očisti canvas kako bi se iscrtali novi elementi

    drawBricksAndScore();
    drawBallAndPaddle();
    checkBrickCollision();

    if (!gameStarted) {
        return; // nacrtaj elemente ali ne izvršavaj ostatak funkcije ako igra nije pokrenuta
    }

    checkWallCollision();
    checkCeilingCollision();

    if (checkPaddleCollision()) { }
    if (checkGameOver()) {
        return;
    }
    if (checkVictory()) {
        return;
    }

    // promjena smjera palice na temelju pritisnute tipke
    if (pressedDirection.right) {
        paddle.x = Math.min(paddle.x + 17, canvas.width - paddle.width); // pomakni palicu u desno (maksimalno do desnog ruba canvasa)
    } else if (pressedDirection.left) {
        paddle.x = Math.max(paddle.x - 17, 0); // pomakni palicu u lijevo (maksimalno do lijevog ruba canvasa)
    }

    // "pomicanje" loptice
    ball.x += ball.dx;
    ball.y += ball.dy;
}

/**
 * Funkcija za resetiranje igre.
 * Postavlja rezultat na 0, ponovno inicijalizira lopticu i njezinu poziciju, postavlja palicu na sredinu canvasa te postavlja status svih cigli na 1 (prikazane).
 */
function resetGame() {
    score = 0;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    initializeBall();
    paddle.x = (canvas.width - paddle.width) / 2;
    for (let c = 0; c < brickConfig.columnCount; c++) {
        for (let r = 0; r < brickConfig.rowCount; r++) {
            bricks[c][r].status = 1;
        }
    }
}


/**
 * Funkcija za pokretanje igre.
 * Dodaje event listenere za pritisak tipki tipkovnice te pokreće funkcije za crtanje elemenata na canvasu kako bi se ti elementi inicijalno prikazali.
 */
function startGame() {
    document.addEventListener('keydown', keyBoardEvents.keyDownHandler, false);
    document.addEventListener('keyup', keyBoardEvents.keyUpHandler, false);
    drawBricksAndScore();
    drawBallAndPaddle();
    initializeBall();
}

// pokretanje inicijalinih funkcija
displayMessage('CLICK SPACE TO START');
startGame();


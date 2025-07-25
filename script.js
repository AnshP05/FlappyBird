// ---------------------------
// Set game physics constants:
// move_speed controls how fast pipes move from right to left
// gravity determines how quickly the bird falls downward every frame
// ---------------------------

let move_speed = 3, gravity = 0.5, pipe_threshold = 145
const max_speed = 20, min_pipe_threshold = 50
let maxScore = JSON.parse(localStorage.getItem("High Score")) ? JSON.parse(localStorage.getItem("High Score")) : 0 , last_leveled_up_score = 0


// ---------------------------
// Select key DOM elements:
// .bird is the bird div, #bird-1 is the bird image
// We get the bird's bounding box for size and position control
// ---------------------------
let bird = document.querySelector('.bird')
let img = document.getElementById('bird-1')
let bird_props = bird.getBoundingClientRect()


// ---------------------------
// Get game area dimensions by selecting the background div
// .getBoundingClientRect() provides its size and position relative to the viewport
// ---------------------------
let background = document.querySelector('.background').getBoundingClientRect()


// ---------------------------
// Score and message setup:
// .score_val = number shown as score
// .message = "Enter to start" prompt
// .score_title = label before the score
// ---------------------------
let score_val = document.querySelector('.score_val')
let message = document.querySelector('.message')
let score_title = document.querySelector('.score_title')
let max_score_val = document.querySelector('.max_score_val')
max_score_val.innerHTML = maxScore
let max_score_title = document.querySelector('.max_score_title')


// ---------------------------
// Game state variable to track phase of game:
// "Start" → before game starts
// "Play" → while game is running
// "End" → after bird crashes
// ---------------------------
let game_state = 'Start'


// ---------------------------
// Initial UI setup:
// Hide bird image until the game starts (for a cleaner start)
// Add the white message box styling to the start message
// ---------------------------
img.style.display = 'none'
message.classList.add('messageStyle')

let warnedRecently = false

// ---------------------------
// Event listener to start the game when "Enter" is pressed
// This runs ONLY if the game isn't already playing
// ---------------------------
document.addEventListener('keydown', (e) => {
    if (e.key === "Enter" && game_state != "Play") {

        // Remove all existing pipes (if restarting after a crash)
        document.querySelectorAll('.pipe_sprite').forEach(e => {
            e.remove()
        })

        // Show the bird image (was hidden at game load)
        img.style.display = 'block'

        // Reset bird position to middle of the screen vertically
        bird.style.top = '40vh'

        // Change game state to active gameplay
        game_state = 'Play'

        // Clear the start message from screen
        message.innerHTML = ''

        // Reset score display elements
        score_title.innerHTML = 'Score : '
        score_val.innerHTML = '0'
        max_score_title.innerHTML = 'Highest Score: '
        max_score_val.innerHTML = maxScore
        // Remove the message box styling (white box) so nothing remains visible
        message.classList.remove('messageStyle')
        move_speed = 3
        play()
    }
})

function play() {
    let bird_dy = 0; // Vertical speed of bird
    let pipe_separation = 0;
    let pipe_gap = 35;

    // Gravity loop
    function apply_gravity() {
        if (game_state !== 'Play') return;

        bird_dy += gravity;
        bird.style.top = bird.getBoundingClientRect().top + bird_dy + 'px';
        bird_props = bird.getBoundingClientRect();

        // Bird hits top or ground
        if (bird_props.top <= 0 || bird_props.bottom >= background.bottom) {
            endGame();
            return;
        }

        const danger_zone = 60
        if(!warnedRecently && (bird_props.top <= danger_zone || bird_props.bottom >= background.bottom - danger_zone)) {
            triggerWarningFlash()
        }

        requestAnimationFrame(apply_gravity);
    }

    // Pipe creation loop
    function create_pipe() {
        if (game_state !== 'Play') return;

        if (pipe_separation > pipe_threshold) {
            pipe_separation = 0;

            let pipe_posi = Math.floor(Math.random() * 43) + 8;

            // Top pipe
            let pipe_top = document.createElement('div');
            pipe_top.className = 'pipe_sprite';
            pipe_top.style.top = pipe_posi - 70 + 'vh';
            pipe_top.style.left = '100vw';
            pipe_top.setAttribute('data-score', '0'); // top pipe doesn't score
            document.body.appendChild(pipe_top);

            // Bottom pipe
            let pipe_bottom = document.createElement('div');
            pipe_bottom.className = 'pipe_sprite';
            pipe_bottom.style.top = pipe_posi + pipe_gap + 'vh';
            pipe_bottom.style.left = '100vw';
            pipe_bottom.setAttribute('data-score', '1'); // only score once
            document.body.appendChild(pipe_bottom);
        }

        pipe_separation++;
        requestAnimationFrame(create_pipe);
    }

    // Movement & collision loop
    function move() {
        if (game_state !== 'Play') return;

        let pipes = document.querySelectorAll('.pipe_sprite');
        bird_props = bird.getBoundingClientRect();

        pipes.forEach(pipe => {
            let pipe_props = pipe.getBoundingClientRect();

            // Remove pipes off screen
            if (pipe_props.right <= 0) {
                pipe.remove();
                return;
            }
            // Only process bottom pipes (data-score="1")
            if (pipe.getAttribute('data-score') === '1') {
                const topPipe = pipe.previousElementSibling;
                if (topPipe && topPipe.classList.contains('pipe_sprite')) {
                    const top_props = topPipe.getBoundingClientRect();
                    const bottom_props = pipe.getBoundingClientRect();

                    const pipeGapTop = top_props.bottom;
                    const pipeGapBottom = bottom_props.top;
                    const birdMidY = bird_props.top + bird_props.height / 2;
                    const safeBuffer = 20;

                    if (
                        bird_props.right > top_props.left && bird_props.left < top_props.right &&
                        (birdMidY < pipeGapTop + safeBuffer || birdMidY > pipeGapBottom - safeBuffer)
                    ) {
                        triggerWarningFlash();
                    }
                }
            }

            // Collision detection
            if (
                bird_props.left < pipe_props.left + pipe_props.width &&
                bird_props.left + bird_props.width > pipe_props.left &&
                bird_props.top < pipe_props.top + pipe_props.height &&
                bird_props.top + bird_props.height > pipe_props.top
            ) {
                endGame();
                return;
            }

            // Scoring check (only once per bottom pipe)
            if (
                pipe.getAttribute('data-score') === '1' &&
                pipe_props.right < bird_props.left
            ) {
                pipe.setAttribute('data-score', '0');
                score_val.innerHTML = parseInt(score_val.innerHTML) + 1;

                const currentScore = parseInt(score_val.innerHTML);
                if (currentScore > maxScore) {
                    maxScore = currentScore;
                    localStorage.setItem("High Score", maxScore);
                    max_score_val.innerHTML = maxScore;
                }

                if (typeof sound_point !== 'undefined') sound_point.play();
                if(move_speed < max_speed && parseInt(score_val.innerHTML)%5 == 0 && parseInt(score_val.innerHTML) > last_leveled_up_score){
                    move_speed += 2
                    pipe_threshold = pipe_threshold > min_pipe_threshold ? pipe_threshold - 10 : min_pipe_threshold
                    last_leveled_up_score = parseInt(score_val.innerHTML)
                }
            }

            // Move pipe left
            pipe.style.left = pipe_props.left - move_speed + 'px';
        });
        
        requestAnimationFrame(move);
    }

    // Key controls
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === ' ') {
            img.src = 'images/Bird-2.png';
            bird_dy = -7.6;
        }
    });

    document.addEventListener('keyup', e => {
        if (e.key === 'ArrowUp' || e.key === ' ') {
            img.src = 'images/Bird.png';
        }
    });

    // End game handler
    function endGame() {
        game_state = 'End';
        message.innerHTML = 'Game Over'.fontcolor('red') + '<br>Press Enter To Restart';
        message.classList.add('messageStyle');
        img.style.display = 'none';
        if (typeof sound_die !== 'undefined') sound_die.play();
        localStorage.setItem("High Score", maxScore)
    }

    // Start animation loops
    requestAnimationFrame(move);
    requestAnimationFrame(apply_gravity);
    requestAnimationFrame(create_pipe);
}

function triggerWarningFlash() {
    const bg = document.querySelector('.background')
    if(bg.classList.contains('warning-flash')) return
    bg.classList.add('warning-flash')
    warnedRecently = true
    setTimeout(() => {
        bg.classList.remove('warning-flash')
        warnedRecently = false
    }, 500)
}
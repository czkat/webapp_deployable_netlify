// game.js
let towers = [[], [], []];
let moveCount = 0;
let totalDisks = 3;
let moveLog = [];
let solving = false;
let solvingTimeouts = [];

function initializeGame(diskNumber) {
    totalDisks = diskNumber;
    towers = [[], [], []];
    for (let i = diskNumber; i >= 1; i--) {
        towers[0].push(i);
    }
    moveCount = 0;
    moveLog = [];
    document.getElementById('moves').textContent = `Moves: ${moveCount}`;
    document.getElementById('min-moves').textContent = `Minimum Moves: ${Math.pow(2, totalDisks) - 1}`;
    document.getElementById('message').textContent = '';
    document.getElementById('hint').textContent = '';
    render();
    
    // Clear any ongoing solving
    solving = false;
    solvingTimeouts.forEach(timeout => clearTimeout(timeout));
    solvingTimeouts = [];
}

function render() {
    document.querySelectorAll('.tower').forEach((towerEl, index) => {
        towerEl.innerHTML = '';
        towers[index].forEach(diskSize => {
            const disk = createDisk(diskSize);
            towerEl.appendChild(disk);
        });
    });

    if (towers[2].length === totalDisks) {
        document.getElementById('message').textContent = 'Congratulations. You won!';
    }
}

function createDisk(size) {
    const disk = document.createElement('div');
    disk.className = `disk size-${size}`;
    disk.dataset.size = size;
    disk.style.width = `${40 + (size-1) * 20}px`;
    disk.textContent = size;
    
    // Add drag functionality
    disk.setAttribute('draggable', true);
    disk.addEventListener('dragstart', dragStart);
    
    return disk;
}

function dragStart(e) {
    if (solving) return;
    
    const tower = e.target.parentElement;
    const towerIndex = parseInt(tower.dataset.index);
    const topDiskElement = tower.lastChild;
    
    // Only allow dragging the top disk
    if (e.target !== topDiskElement) {
        e.preventDefault();
        return;
    }
    
    e.dataTransfer.setData('text/plain', towerIndex);
    e.target.classList.add('dragging');
}

// Set up towers as drop targets
document.querySelectorAll('.tower').forEach(tower => {
    tower.addEventListener('dragover', e => {
        e.preventDefault(); // Allow drop
    });
    
    tower.addEventListener('dragenter', e => {
        e.preventDefault();
    });
    
    tower.addEventListener('drop', e => {
        e.preventDefault();
        const fromTowerIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toTowerIndex = parseInt(e.currentTarget.dataset.index);
        
        // Remove dragging class from all disks
        document.querySelectorAll('.disk').forEach(disk => {
            disk.classList.remove('dragging');
        });
        
        if (fromTowerIndex !== toTowerIndex) {
            moveDisk(fromTowerIndex, toTowerIndex);
        }
    });
});

// Clean up when drag ends
document.addEventListener('dragend', e => {
    e.target.classList.remove('dragging');
});

function moveDisk(from, to) {
    const fromTower = towers[from];
    const toTower = towers[to];

    if (!fromTower.length) return false;
    const diskValue = fromTower[fromTower.length - 1];
    if (!toTower.length || diskValue < toTower[toTower.length - 1]) {
        toTower.push(fromTower.pop());
        moveCount++;
        document.getElementById('moves').textContent = `Moves: ${moveCount}`;
        
        // Log the move
        const fromPeg = String.fromCharCode(65 + from); // A, B, or C
        const toPeg = String.fromCharCode(65 + to); // A, B, or C
        moveLog.push(`Disk ${diskValue} from ${fromPeg} to ${toPeg}`);
        
        render();
        
        fetch('/.netlify/functions/logMove', {
            method: 'POST',
            body: JSON.stringify({ moves: moveCount }),
            headers: { 'Content-Type': 'application/json' }
        }).catch(error => console.error('Error logging move:', error));
        
        return true;
    }
    return false;
}

function resetGame() {
    const diskSelect = document.getElementById('diskCount');
    const selectedDisks = parseInt(diskSelect.value);
    initializeGame(selectedDisks);
}

// Show the move log
function showLog() {
    const modal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    
    if (moveLog.length === 0) {
        logContent.innerHTML = '<p>No moves recorded yet.</p>';
    } else {
        logContent.innerHTML = moveLog.map((log, index) => 
            `<p>${index + 1}. ${log}</p>`
        ).join('');
    }
    
    modal.style.display = 'block';
}

// Close the modal when clicking the X
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('log-modal').style.display = 'none';
});

// Close the modal when clicking outside of it
window.addEventListener('click', (e) => {
    const modal = document.getElementById('log-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

function showHint() {
    // Calculate optimal solution steps
    const optimalMoves = Math.pow(2, totalDisks) - 1;
    const progress = Math.min(100, Math.round((moveCount / optimalMoves) * 100));
    
    // Analyze game state
    const state = analyzeGameState();
    
    // Generate context-aware hints
    let hint = "";
    
    if (moveCount === 0) {
        hint = "Start by moving the smallest disk. For an odd number of disks, move it to the destination tower; for even, move to the auxiliary tower.";
    } else if (state.isStuck) {
        hint = "You seem stuck. Remember the pattern: move the smallest disk in a clockwise direction (A to B, B to C, or C to A), then make the only valid move that doesn't involve the smallest disk.";
    } else if (state.suboptimalMoves > 5) {
        hint = "Your solution is taking longer than needed. Try to develop a consistent pattern when moving the disks.";
    } else if (state.nearCompletion) {
        hint = "You're almost there! Focus on moving the remaining smaller disks in the right sequence to build on top of the larger ones.";
    } else {
        // Choose a hint based on the specific game situation
        const situationalHints = [
            "Look for the smallest disk - it should move in a consistent cycle between towers.",
            "After moving the smallest disk, there's always exactly one other valid move. Can you spot it?",
            "Think about which tower needs to be cleared to receive the next largest disk.",
            "The Tower of Hanoi has a recursive pattern. How you moved 2 disks is how you'll move groups of disks.",
            "Sometimes you need to make moves that temporarily seem to take you further from your goal."
        ];
        
        // Choose a hint based on disk count, move count, and tower state
        const hintIndex = (moveCount + totalDisks + towers[1].length) % situationalHints.length;
        hint = situationalHints[hintIndex];
    }
    
    document.getElementById("hint").innerHTML = hint;
}

function analyzeGameState() {
    // Analyze the current game state to determine key characteristics
    return {
        isStuck: moveCount > 0 && previousMoveCount === moveCount, // Detect if player is stuck
        suboptimalMoves: moveCount - calculateMinimumMoves(towers, totalDisks),
        nearCompletion: towers[2].length >= totalDisks - 2,
        // Add other state analysis as needed
    };
}

// Keep track of previous move count to detect when player is stuck
let previousMoveCount = 0;
setInterval(() => {
    previousMoveCount = moveCount;
}, 5000);

function calculateMinimumMoves(currentTowers, diskCount) {
    // A basic estimate of minimum moves needed from current state
    // This is a simplified calculation
    return Math.pow(2, diskCount) - 1 - towers[2].length * 2;
}

// Solve the Tower of Hanoi automatically
unction solve() {
    if (solving) return;
    
    // Reset the game first
    resetGame();
    solving = true;
    
    // Set move durations
    const moveDuration = 500; // 0.5 seconds for the move
    const pauseDuration = 500; // 0.5 seconds pause between moves
    const totalStepTime = moveDuration + pauseDuration;
    
    // Queue to store all moves
    const moveQueue = [];
    
    // Recursive function to determine all moves needed
    function hanoiMoves(n, source, auxiliary, destination) {
        if (n === 0) return;
        
        // Move n-1 disks from source to auxiliary
        hanoiMoves(n-1, source, destination, auxiliary);
        
        // Move the nth disk from source to destination
        moveQueue.push([source, destination]);
        
        // Move n-1 disks from auxiliary to destination
        hanoiMoves(n-1, auxiliary, source, destination);
    }
    
    // Calculate all moves needed
    hanoiMoves(totalDisks, 0, 1, 2);
    
    // Execute moves with animation
    moveQueue.forEach((move, index) => {
        solvingTimeouts.push(setTimeout(() => {
            const [from, to] = move;
            
            // Animate the move
            animateMove(from, to, moveDuration);
        }, index * totalStepTime));
    });
    
    // Reset solving status after completion
    solvingTimeouts.push(setTimeout(() => {
        solving = false;
    }, moveQueue.length * totalStepTime));
}

// Add a new function to animate disk movement
function animateMove(from, to, duration) {
    const fromTower = document.querySelector(`.tower[data-index="${from}"]`);
    const toTower = document.querySelector(`.tower[data-index="${to}"]`);
    
    if (!towers[from].length) return;
    
    const diskToMove = fromTower.lastChild;
    const diskValue = towers[from][towers[from].length - 1];
    
    // Create a clone for animation
    const diskClone = diskToMove.cloneNode(true);
    document.body.appendChild(diskClone);
    
    // Position the clone at the source disk position
    const diskRect = diskToMove.getBoundingClientRect();
    const toTowerRect = toTower.getBoundingClientRect();
    
    diskClone.style.position = 'fixed';
    diskClone.style.left = `${diskRect.left}px`;
    diskClone.style.top = `${diskRect.top}px`;
    diskClone.style.zIndex = '1000';
    
    // Calculate destination position (at the top of the target tower)
    const destX = toTowerRect.left + (toTowerRect.width - diskRect.width) / 2;
    const destY = toTowerRect.bottom - diskRect.height;
    
    // Hide the original disk during animation
    diskToMove.style.visibility = 'hidden';
    
    // Animate
    const startTime = performance.now();
    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const currentX = diskRect.left + (destX - diskRect.left) * progress;
        const currentY = diskRect.top + (destY - diskRect.top) * progress;
        
        diskClone.style.left = `${currentX}px`;
        diskClone.style.top = `${currentY}px`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete
            document.body.removeChild(diskClone);
            
            // Actually move the disk in the game state
            moveDisk(from, to);
            
            // Restore visibility of the original disk (now in its new position)
            fromTower.lastChild?.style.removeProperty('visibility');
        }
    }
    
    requestAnimationFrame(animate);
}

// Add functionality to the Next Game button
document.addEventListener('DOMContentLoaded', function() {
    const nextGameButton = document.querySelector('.next-game-button');
    if (nextGameButton) {
        nextGameButton.addEventListener('click', function() {
            // Here you could redirect to another game or show a menu
            alert('Next game feature coming soon!');
        });
    }
});

// Initial game setup
initializeGame(3);

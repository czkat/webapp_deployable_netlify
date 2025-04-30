let towers = [[], [], []];
let selectedTower = null;
let moveCount = 0;
let totalDisks = 3;

function initializeGame(diskNumber) {
    totalDisks = diskNumber;
    towers = [[], [], []];
    for (let i = diskNumber; i >= 1; i--) {
        towers[0].push(i);
    }
    moveCount = 0;
    document.getElementById('moves').textContent = `Moves: ${moveCount}`;
    document.getElementById('message').textContent = '';
    render();
}

function render() {
    document.querySelectorAll('.tower').forEach((towerEl, index) => {
        towerEl.innerHTML = '';
        towers[index].forEach(diskSize => {
            const disk = document.createElement('div');
            disk.className = `disk size-${diskSize}`;
            disk.style.width = `${diskSize * 30}px`;
            disk.textContent = diskSize;
            towerEl.appendChild(disk);
        });
        towerEl.classList.toggle('selected', selectedTower === index);
    });

    if (towers[2].length === totalDisks) {
        document.getElementById('message').textContent = 'Congratulations. You won!';
    }
}
function createDisk(size) {
    const disk = document.createElement('div');
    disk.classList.add('disk');
    disk.dataset.size = size;
    disk.style.width = `${30 + size * 20}px`; // Adjust width as needed
    disk.style.height = `20px`;
    disk.style.margin = '2px auto';
    disk.style.backgroundColor = getColor(size); // Optional: color based on size
    return disk;
}

function getColor(size) {
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
    return colors[(size - 1) % colors.length];
}

function moveDisk(from, to) {
    const fromTower = towers[from];
    const toTower = towers[to];

    if (!fromTower.length) return;
    const diskValue = fromTower[fromTower.length - 1];
    if (!toTower.length || diskValue < toTower[toTower.length - 1]) {
        toTower.push(fromTower.pop());
        moveCount++;
        document.getElementById('moves').textContent = `Moves: ${moveCount}`;
        render();
    }
    
    fetch('/.netlify/functions/logMove', {
        method: 'POST',
        body: JSON.stringify({ moves: moveCount }),
        headers: { 'Content-Type': 'application/json' }
    }).catch(error => console.error('Error logging move:', error));    
    
}

  
function resetGame() {
    const diskSelect = document.getElementById('diskCount');
    const selectedDisks = parseInt(diskSelect.value);
    initializeGame(selectedDisks);
}

// Click event for towers
document.querySelectorAll('.tower').forEach(towerEl => {
    towerEl.addEventListener('click', () => {
        const index = parseInt(towerEl.dataset.index);

        if (selectedTower === null) {
            selectedTower = index;
        } else {
            if (selectedTower !== index) {
                moveDisk(selectedTower, index);
            }
            selectedTower = null;
        }

        render();
    });
});

// Initial game setup
initializeGame(3);

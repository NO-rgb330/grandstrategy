// app.js (revised)

document.addEventListener('DOMContentLoaded', () => {
  const mainMenu = document.getElementById('main-menu');
  const gameScreen = document.getElementById('game-screen');
  const btnPlay = document.getElementById('btn-play');
  const btnEndTurn = document.getElementById('btn-end-turn');
  const btnRecruit = document.getElementById('btn-recruit');
  const btnAttack = document.getElementById('btn-attack');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalMessage = document.getElementById('modal-message');
  const modalClose = document.getElementById('modal-close');

  const statGold = document.getElementById('stat-gold');
  const statManpower = document.getElementById('stat-manpower');
  const statTurn = document.getElementById('stat-turn');
  const statDate = document.getElementById('stat-date');
  const mapProgressFill = document.getElementById('map-progress-fill');
  const mapProgressText = document.getElementById('map-progress-text');

  const selName = document.getElementById('sel-name');
  const selOwner = document.getElementById('sel-owner');
  const selUnits = document.getElementById('sel-units');
  const selIncome = document.getElementById('sel-income');

  let attackMode = false;
  let mapInitialized = false;

  // Helper to show modal
  function showModal(msg) {
    modalMessage.textContent = msg;
    modalOverlay.classList.remove('hidden');
  }

  modalClose.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
  });

  // Format date
  function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Update all UI elements
  function updateUI() {
    statGold.textContent = Game.gold;
    statManpower.textContent = Game.manpower;
    statTurn.textContent = Game.turn;
    statDate.textContent = formatDate(Game.date);

    const pct = Game.getMapControlPercentage();
    mapProgressFill.style.width = pct + '%';
    mapProgressText.textContent = pct + '%';

    const sel = Game.getSelected();
    if (sel) {
      selName.textContent = sel.name;
      selOwner.textContent = 'Owner: ' + (sel.owner === Game.playerFaction ? 'You' : (sel.owner === Game.aiFaction ? 'Enemy' : 'Neutral'));
      selUnits.textContent = 'Units: ' + sel.units;
      selIncome.textContent = 'Income: ' + sel.income + 'g / ' + sel.manpowerIncome + 'm';
      btnRecruit.disabled = !Game.canRecruit();
      btnAttack.disabled = !Game.canAttack();
    } else {
      selName.textContent = 'None';
      selOwner.textContent = 'Owner: -';
      selUnits.textContent = 'Units: -';
      selIncome.textContent = 'Income: -';
      btnRecruit.disabled = true;
      btnAttack.disabled = true;
    }
  }

  // Start game
  btnPlay.addEventListener('click', async () => {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    try {
      const response = await fetch('custom.geo.json');
      const geojson = await response.json();

      const features = geojson.features;
      Game.init(features);

      if (!mapInitialized) {
        GameMap.init('map');
        mapInitialized = true;
      }

      // Render with the enhanced callback that handles attack mode
      GameMap.render(features, (id) => {
        if (attackMode) {
          // Execute attack
          const result = Game.attack(id);
          GameMap.updateColors();
          updateUI();
          showModal(result.message);
          attackMode = false;
          document.getElementById('map').style.cursor = '';
          btnAttack.disabled = !Game.canAttack(); // re-enable if still possible
        } else {
          // Normal selection
          Game.selectTerritory(id);
          GameMap.highlight(id);
          updateUI();
        }
      });

      updateUI();
    } catch (err) {
      showModal('Failed to load map data: ' + err.message);
    }
  });

  // End Turn
  btnEndTurn.addEventListener('click', () => {
    const result = Game.endTurn();
    GameMap.updateColors();
    updateUI();

    if (result.victory === true) {
      showModal('VICTORY! ' + result.message);
    } else if (result.victory === false) {
      showModal('DEFEAT. ' + result.message);
    } else {
      showModal(result.message);
    }
  });

  // Recruit
  btnRecruit.addEventListener('click', () => {
    if (Game.recruit()) {
      updateUI();
      showModal('Recruited 1 Infantry.');
    } else {
      showModal('Cannot recruit. Need 50 Gold and 10 Manpower.');
    }
  });

  // Attack (enter attack mode)
  btnAttack.addEventListener('click', () => {
    if (!Game.canAttack()) {
      showModal('Not enough units or not your territory.');
      return;
    }
    attackMode = true;
    document.getElementById('map').style.cursor = 'crosshair';
    showModal('Click on an enemy territory to attack.');
  });

  // Reset attack mode on right-click or ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      attackMode = false;
      document.getElementById('map').style.cursor = '';
    }
  });

  // Sidebar buttons (placeholder)
  document.querySelectorAll('.side-btn').forEach(btn => {
    if (btn.id === 'btn-end-turn') return;
    btn.addEventListener('click', () => {
      showModal('This feature is not yet implemented in the prototype.');
    });
  });
});

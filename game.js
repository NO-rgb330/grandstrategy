// game.js — Core game state and logic

const Game = {
  // Resources
  gold: 200,
  manpower: 50,

  turn: 1,
  date: new Date(1940, 0, 1), // Jan 1940

  // Map data
  territories: {}, // id -> territory object
  selectedTerritoryId: null,

  // Player faction (simplified: player controls "Blue" faction)
  playerFaction: 'player',
  aiFaction: 'ai',

  // Map control tracking
  totalTerritories: 0,
  playerTerritories: 0,

  // Unit definitions (simple)
  unitTypes: {
    infantry: { name: 'Infantry', cost: 50, attack: 1, defense: 1, manpowerCost: 10 }
  },

  // Initialize game state from GeoJSON features
  init(features) {
    this.territories = {};
    this.totalTerritories = 0;
    this.playerTerritories = 0;

    features.forEach((feature, index) => {
      const props = feature.properties;
      const name = props.name || props.admin || `Territory ${index}`;
      const id = props.iso_a3 || props.sov_a3 || `t_${index}`;

      // Assign ownership: alternate between player and AI for demo
      // In a real game, you'd have a start scenario.
      const owner = index % 2 === 0 ? this.playerFaction : this.aiFaction;

      const territory = {
        id: id,
        name: name,
        owner: owner,
        units: 3, // starting units
        income: Math.floor(Math.random() * 20) + 10, // 10-30 gold per turn
        manpowerIncome: Math.floor(Math.random() * 5) + 2, // 2-6 manpower per turn
        neighbors: [], // we'll compute adjacency later if needed
        feature: feature // store original feature for map
      };

      this.territories[id] = territory;
      this.totalTerritories++;

      if (owner === this.playerFaction) {
        this.playerTerritories++;
      }
    });

    // Compute adjacency (simplified: based on shared borders)
    // For a real game, you'd precompute or use a library.
    // Here we skip for MVP; combat will be possible with any territory for simplicity.
  },

  // Get territory by id
  getTerritory(id) {
    return this.territories[id];
  },

  // Select a territory
  selectTerritory(id) {
    this.selectedTerritoryId = id;
  },

  // Get selected territory
  getSelected() {
    return this.selectedTerritoryId ? this.territories[this.selectedTerritoryId] : null;
  },

  // Check if player can recruit in selected territory
  canRecruit() {
    const t = this.getSelected();
    return t && t.owner === this.playerFaction && this.gold >= 50 && this.manpower >= 10;
  },

  // Recruit infantry
  recruit() {
    if (!this.canRecruit()) return false;
    const t = this.getSelected();
    t.units += 1;
    this.gold -= 50;
    this.manpower -= 10;
    return true;
  },

  // Check if player can attack from selected territory
  canAttack() {
    const t = this.getSelected();
    return t && t.owner === this.playerFaction && t.units > 1; // need at least 2 to attack (leave 1 behind)
  },

  // Perform attack on a target territory
  attack(targetId) {
    const attacker = this.getSelected();
    const defender = this.territories[targetId];

    if (!attacker || !defender) return { success: false, message: 'Invalid attack.' };
    if (attacker.owner !== this.playerFaction) return { success: false, message: 'You do not own this territory.' };
    if (defender.owner === this.playerFaction) return { success: false, message: 'You cannot attack your own territory.' };
    if (attacker.units <= 1) return { success: false, message: 'Not enough units to attack. Leave at least 1 behind.' };

    // Simple combat resolution
    const attackPower = attacker.units * (0.8 + Math.random() * 0.4); // 0.8–1.2 multiplier
    const defensePower = defender.units * (0.9 + Math.random() * 0.3); // 0.9–1.2 multiplier

    if (attackPower > defensePower) {
      // Attacker wins
      const survivingUnits = Math.max(1, Math.floor(attacker.units * (1 - defensePower / attackPower)));
      attacker.units -= survivingUnits;
      defender.owner = this.playerFaction;
      defender.units = survivingUnits;

      // Update territory counts
      this.playerTerritories++;
      // (AI territory count would decrease, but we only track player for progress)

      return { success: true, message: `Victory! You captured ${defender.name} with ${survivingUnits} units remaining.` };
    } else {
      // Defender wins
      const attackerLosses = Math.max(1, Math.floor(attacker.units * (defensePower / attackPower)));
      attacker.units -= attackerLosses;
      // Defender might lose some units too, but simplified: defender loses 1 unit
      defender.units = Math.max(1, defender.units - 1);

      return { success: false, message: `Attack failed. You lost ${attackerLosses} units.` };
    }
  },

  // AI turn logic (very simple)
  aiTurn() {
    const aiTerritories = Object.values(this.territories).filter(t => t.owner === this.aiFaction);
    const playerTerritories = Object.values(this.territories).filter(t => t.owner === this.playerFaction);

    if (aiTerritories.length === 0) return; // AI eliminated

    // AI randomly picks a territory to attack or reinforce
    const action = Math.random();
    if (action < 0.3) {
      // Recruit in a random AI territory (if it has gold—simplified: AI cheats a bit)
      const target = aiTerritories[Math.floor(Math.random() * aiTerritories.length)];
      target.units += 1;
    } else if (action < 0.7 && playerTerritories.length > 0) {
      // Attack a random player territory from a random AI territory
      const attacker = aiTerritories[Math.floor(Math.random() * aiTerritories.length)];
      if (attacker.units > 1) {
        const target = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
        // Simple AI combat: similar to player combat but without resource cost
        const attackPower = attacker.units * (0.8 + Math.random() * 0.4);
        const defensePower = target.units * (0.9 + Math.random() * 0.3);
        if (attackPower > defensePower) {
          const survivingUnits = Math.max(1, Math.floor(attacker.units * (1 - defensePower / attackPower)));
          attacker.units -= survivingUnits;
          target.owner = this.aiFaction;
          target.units = survivingUnits;
          this.playerTerritories--;
        } else {
          attacker.units = Math.max(1, attacker.units - 1);
        }
      }
    }
    // else: do nothing
  },

  // End player turn, process AI, then start next player turn
  endTurn() {
    // AI takes its turn
    this.aiTurn();

    // Advance turn counter and date
    this.turn++;
    this.date.setMonth(this.date.getMonth() + 1);

    // Generate resources for player based on controlled territories
    let goldIncome = 0;
    let manpowerIncome = 0;
    Object.values(this.territories).forEach(t => {
      if (t.owner === this.playerFaction) {
        goldIncome += t.income;
        manpowerIncome += t.manpowerIncome;
      }
    });

    this.gold += goldIncome;
    this.manpower += manpowerIncome;

    // Check for victory
    if (this.playerTerritories === this.totalTerritories) {
      return { victory: true, message: 'You have conquered all of Europe!' };
    }
    if (this.playerTerritories === 0) {
      return { victory: false, message: 'You have been eliminated.' };
    }

    return { victory: null, message: `Turn ${this.turn}. Income: +${goldIncome} gold, +${manpowerIncome} manpower.` };
  },

  // Get percentage of map controlled by player
  getMapControlPercentage() {
    if (this.totalTerritories === 0) return 0;
    return Math.floor((this.playerTerritories / this.totalTerritories) * 100);
  }
};

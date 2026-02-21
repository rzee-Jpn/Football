import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // Main game logic goes here
    this.add.text(100, 100, 'Game Scene', { fill: '#ffffff' });
  }

  update() {
    // Game update loop
  }
}
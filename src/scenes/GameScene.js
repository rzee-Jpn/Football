import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // Add game objects and logic here
    this.add.text(400, 300, 'Game Scene', { fontSize: '32px', fill: '#fff' })
      .setOrigin(0.5);
  }

  update() {
    // Update game objects and logic here
  }
}
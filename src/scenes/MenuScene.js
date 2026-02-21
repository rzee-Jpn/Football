import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // Add menu UI and start game button
    this.add.text(100, 100, 'Click to Start', { fill: '#ffffff' })
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.start('Game');
      });
  }
}
import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // Add menu UI and start game button
    this.add.text(400, 300, 'Click to Start', { fontSize: '32px', fill: '#fff' })
      .setOrigin(0.5);

    this.input.on('pointerdown', () => {
      this.scene.start('Game');
    });
  }
}
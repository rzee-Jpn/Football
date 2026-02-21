import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    // Add game over UI and restart button
    this.add.text(400, 300, 'Game Over', { fontSize: '32px', fill: '#fff' })
      .setOrigin(0.5);

    this.input.on('pointerdown', () => {
      this.scene.start('Menu');
    });
  }
}
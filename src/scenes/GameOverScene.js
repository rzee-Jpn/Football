import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    // Game over screen UI
    this.add.text(100, 100, 'Game Over', { fill: '#ffffff' })
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.start('Menu');
      });
  }
}
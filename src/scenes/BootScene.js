import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load any assets needed for the preloader here
  }

  create() {
    this.scene.start('Menu');
  }
}
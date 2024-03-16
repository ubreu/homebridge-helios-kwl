<p align="center">
<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Helios KWL Plugin

This is a [Homebridge](https://homebridge.io/) plugin for the [Helios KWL Easycontrols](https://www.easycontrols.net/de/) system.
When activated the Helios KWL ventilation systemr is added as a fan accessory to HomeKit and the plugin tracks the fan status of the system.

## Configuration

The required configuration parameters are the Helio host (e.g. 192.168.1.10) and the websocket port (default is 80).

## Development

### Setup Development Environment

You must have Node.js 18 or later installed. This plugin uses [Nix flakes](https://nixos.wiki/wiki/Flakes) to provide the necessary development tools.

### Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```shell
$ npm install
```

### Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```shell
$ npm run build
$ npm run test
```

### Publish Package

When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json) file then run:

```shell
$ npm publish --access=public
```

You can publish *beta* versions of your plugin for other users to test before you release it to everyone.

```shell
# create a new pre-release version (eg. 2.1.0-beta.1)
$ npm version prepatch --preid beta

# publish to @beta
$ npm publish --tag=beta --access=public
```

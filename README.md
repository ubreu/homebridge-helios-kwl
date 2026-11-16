<p align="center">
<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Helios KWL Plugin

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=for-the-badge&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

This is a [Homebridge](https://homebridge.io/) plugin for the [Helios KWL Easycontrols](https://www.easycontrols.net/de/) system in version >= 3.0.
When activated the Helios KWL ventilation systemr is added as a fan accessory to HomeKit and the plugin tracks the fan status of the system.

## Configuration

The required configuration parameters are the Helio host (e.g. 192.168.1.10) and the websocket port (default is 80).

## HomeKit controls

The ventilation appears as one accessory with a fan and two switches:

| Control | Ventilation mode |
|---|---|
| Fan on / off | Home / Away |
| Fan speed slider (long-press the fan tile): 50 % / 100 % | Home / Boost |
| **Boost** switch on | Boost: high airflow (speed set in Easycontrols) for 30 minutes |
| **Fireplace** switch on | Fireplace ("Kaminfunktion"): more supply than exhaust air, so a stove draws properly, for 15 minutes |
| Boost or Fireplace switch off | Home |

When Boost or Fireplace runs out, the unit goes back to the mode it was in before: Home, or Away if the fan was off.

The plugin polls the unit every 15 seconds, so changes made in the Easycontrols app or on the unit show up in HomeKit within that time.

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

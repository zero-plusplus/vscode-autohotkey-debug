**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# IMPORTANT

I stopped maintenance after `v1.11.1`, but decided to provide a small patch that does not affect the [main project](https://github.com/zero-plusplus/autohotkey-devtools). If it is not too much work, I might port some of the features that were planned to be added in `v2.0.0`. However, I have not decided whether or not I will continue to provide patches in the future and this may be the last patch.

I accept [Issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues), but they are not always corrected. I respond to them by the next day at the latest, unless there is a problem.

## License Revision Notice

This extension is a personal tool in one of my projects to achieve personal goals. To make this clear, I have decided to revoke the MIT license from `v1.11.1`.

From now on, only personal use by end user at your own risk will be permitted.
In other words, this change does not affect end users.

It is MIT licensed up to `v1.11.0`, but I will stop applying the small patches I plan to make in the future if I feel that the source code has been used to interfere with the growth of this extension as a result.

I understand that this change is selfish of me, but I hope you understand that it is necessary for me to complete all my projects.

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

# Update `v1.12.0`

> **Note: The v1.11.1 and later versions are provided with much less time spent on implementation and its testing. I will make every effort not to reduce reliability, but please be aware of this before installing.**

## Added

> **Note: All features added after `v1.11.1` are experimental. Specifications are not finalized and may be withdrawn in the future due to conflicts with existing features or other reasons.**

* The `runtime` attribute of launch.json now accepts object keyed by language ID (e.g. `[ahk]`) or extension (e.g. `.ahk`). This is similar to `runtime_v1` and `runtime_v2`, but more flexible

## Fixed

* Update dependent packages

# Installation
1. Install [VSCode](https://code.visualstudio.com/) with version `1.49.0` or higher
2. Install [AutoHotkey](https://www.autohotkey.com/)
3. **Install an another extension to support AutoHotkey** (the famous [slevesque.vscode-autohotkey](https://marketplace.visualstudio.com/items?itemName=slevesque.vscode-autohotkey), If you use v2, use [dudelmoser.vscode-autohotkey2](https://marketplace.visualstudio.com/items?itemName=dudelmoser.vscode-autohotkey2), etc.)
4. Open VSCode, press `Ctrl + P` then type `ext install zero-plusplus.vscode-autohotkey-debug`

## For advanced users
This extension will work without configuration as long as you follow the steps above.

However, if you want to use a different version of AutoHotkey for which no installer is provided, you will need to configure it separately.

By default, the runtime is configured for each file extension as shown below, so please place the runtime in the same path.
* `ahk` - `C:/Program Files/AutoHotkey/AutoHotkey.exe`
* `ahk2` or `ah2` - `C:/Program Files/AutoHotkey/v2/AutoHotkey.exe`

If you want to place the runtime in a specified folder, you need to set the [runtime](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Launch-Mode) attribute in launch.json.

# Usage
1. Open a file with the extension `ahk`, `ahk2` or `ah2`.
2. (optional) Set [Breakpoint](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Breakpoint) where you want them
3. Press `F5`

If you want to enable more advanced features and make more detailed settings, please refer to [Debug configurations](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Debug-configurations).

If you need to run the script without debugging, choose `Run -> Run Without Debugging` from the menu or press `Ctrl + F5`.

For more information on how to use many of the other features, see [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki).

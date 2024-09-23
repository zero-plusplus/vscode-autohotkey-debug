**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

**If you encounter problems with v1.11.1, please downgrade to v1.11.0.**

# IMPORTANT
In order to protect my goal of growing my extension, I have decided to waive the MIT license. This is a statement that I do not want you to use my source code in ways that compete with my activities. Also, please do not include it in extension pack, etc.

This does not affect end users at all. Please continue to use the end user as before.

From now on, I have decided to develop an [AutoHotkey IDE](https://github.com/zero-plusplus/autohotkey-devtools) from scratch under a new license. The features of vscode-autohotkey-debug up to v1.11.0 and those planned to be implemented in v2.0.0 will be integrated into this IDE after it is reconfigured.

I apologize to those of you who have been waiting for v2.0.0 of this extension, please understand.

Basically, I will cease activity on this extension, but I will continue to respond to [Discussions](https://github.com/zero-plusplus/vscode-autohotkey-debug/discussions) regarding usage, etc.

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

## Update
* `1.11.1` - 202x-xx-xx
  * Support working with [AutoHotkey Dev Tools](https://github.com/zero-plusplus/autohotkey-devtools) to be released in the future

There will be no further updates. Previous changes can be found [here](CHANGELOG.md).

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

**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# IMPORTANT
The MIT license was a mismatch for my purposes, so I have decided to stop maintaining this project.

From now on, I plan to develop [here](https://github.com/zero-plusplus/autohotkey-devtools) an integrated development environment for AutoHotkey under the new license. This project was supposed to be the main body of vscode-autohotkey-debug, and the features that were supposed to be implemented in v2.0.0 will be re-implemented here with different specifications.

It will take some time to release the software because I need to rewrite the source code from scratch and implement other features besides the debugger.

While this project will cease maintenance, I will not archive the repository in order to provide support to users who have installed this extension for questions about its usage.
Support does not include bug fixes, but I may be able to work with you to find a workaround.

The support is provided in [Issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues) or [Discussions](https://github.com/zero-plusplus/vscode-autohotkey-debug/discussions). I think I will be able to reply by the next day unless there are problems in the future as well.

Finally, I apologise for the prolonged development due to trying to implement a lot of features and also for ending the maintenance before providing v2.0.0.
In the next project I plan to repeat small releases based on the failures of this one. However, the release will be at a slower pace until the project base is completed.

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

## Update
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

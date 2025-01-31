**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# IMPORTANT

I stopped maintenance after `v1.11.1`, but decided to provide a small patch that does not affect the [main project](https://github.com/zero-plusplus/autohotkey-devtools). If it is not too much work, I might port some of the features that were planned to be added in `v2.0.0`. However, I have not decided whether or not I will continue to provide patches in the future and this may be the last patch.

I accept [Issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues), but they are not always corrected. I respond to them by the next day at the latest, unless there is a problem.

## License Revision Notice

> **Note: The license for the `source code` of this extension has been changed since `v1.11.1`, but this does not affect end users. You are free to continue to use it at your own risk.**

The current license prohibits use by anyone other than end users and completely prohibits the inclusion of my source code in other projects. Please also refrain from any other actions that may have an indirect affect on the project, such as including it in an extensions pack. These are intended to preserve the value of my extension and not create unnecessary extension conflict issues.

The reason my extension can work together without conflicts is that they have completely standalone source code on the marketplace. However, if a third party inclues the source code and uploads it to the marketplace, then a situation may arise where multiple copies of the same debugger adapter are installed on a single VSCode, depending on the combination. If this creates a conflict problem, it will reduce the reliability of my extension.

Also, including the source code means that you do not have to install my extension to use its features. That is the opposite of the goal of growing my extension.

In the extreme, if all extensions supporting AutoHotkey incorporated my source code, there would be no point in installing my extension. On the contrary, installing it would just be annoying because it would create a conflict problem. It would be more beneficial to the user to remove my extension when that happens.

Of course, I understand that these are extreme examples to show that adverse effects can occur and that such things will not happen in practice.

The above problem surfaced with the [proposal](https://github.com/zero-plusplus/vscode-autohotkey-debug/discussions/332) to actually include the source code. Since this proposal itself was not a problem at all as the MIT license, I finally decided that the MIT license was not the optimal license for my activities and decided to change the license. I apologize here for causing so much trouble at this time due to my ignorance and no understanding of the license. Also, thank you for accepting my selfishness.

The reason I decided to stop maintenance instead of continuing after changing the license is that until `v1.11.0` it is effectively an MIT license, which does not fundamentally solve the above problem.

I have added many unique features to grow this extension and have added more refined features as I have received feedback from end users that I have gained from it. Because of the importance of this cycle in creating a great tool, I cannot continue to maintain it with problems that could destroy it.

Due to personal circumstances, I have resumed maintenance, but this is the reason why I am limiting it to only minimal patches.

Finally, all my projects are personal tools that are only publicly available and developed by myself. I cannot accept any proposals for cooperation, as I do so with the intention of achieving my personal goals.

All I need is feedback from end users.

Again, the license change is for development reasons and has nothing to do with the end user.

Thank you.

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

## Update
* `1.11.1` - 2024-09-23
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

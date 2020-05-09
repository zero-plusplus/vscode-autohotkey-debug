**By Google Translate from Japanese to English.**

# Overview
I made it for the purpose of replacing the debugger of Scite4AutoHotkey.
So you can use all the features it can.
In addition to that, I am implementing new features such as conditional breakpoints.
All features can be found in [`Features`](#features).

# Installation
Press `F1`, type `ext vscode-ahk-debug`

# Features

# Known issues
AutoHotkey v1
AutoHotkey v2
* Inspecting a property shows `"<error>"`.

# Issues
See [issues](https://github.com/zero-plusplus/vscode-ahk-debug/issues)

# Roadmap
- [x] Variable inspect
    - [x] Primitive
    - [x] Object
- [ ] Call stack
    - [x] Call stack list
    - [ ] Toggle skipping this file
    - [ ] Restart frame
- [x] Show loaded scripts
- [ ] Breakpoints
    - [x] Basic breakpoints
    - [ ] Column breakpoints
    - [ ] Function breakpoints
    - [ ] Conditional breakpoints
    - [ ] Hit Conditional breakpoints
    - [ ] Log point
- [x] Step-in, step-over, step-out
- [ ] Watch expression
    - [ ] Variable name
    - [ ] Expression
- [ ] Show value when hovering
    - [x] Variable name
    - [ ] Expression
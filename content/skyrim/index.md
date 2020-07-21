+++
title = "Skyrim"
template = "content.html"
date = 2020-07-21
+++

{{banner(url="skyrim.webp")}}

## Skyrim Modlist

This is my Skyrim modlist, presented as is. I use it as a base for Skyrim modding, and I'm sharing
it here in case it's useful to others. It may or may not be up to date and installable; no
guarantees or support are offered in this regard.

### What Is It

It's mostly visuals and atmospheric content to make Skyrim look like a modern game, with all the
standard bug fixes, a number of strictly optional gameplay mods (notably
[_Skyrim Redone_](https://www.nexusmods.com/skyrimspecialedition/mods/17915) and the approved suite
of survival/crafting mods), and a small amount of non-intrusive playable content (notably
[_Hammet's Dungeon Pack_](https://www.nexusmods.com/skyrimspecialedition/mods/12186) and
[_Skyrim Sewers_](https://www.nexusmods.com/skyrimspecialedition/mods/9320)). Also, most
importantly, [Dachshunds](https://www.nexusmods.com/skyrimspecialedition/mods/37560).

### Download

Download this: [Bodilrim-0.1.wabbajack](Bodilrim-0.1.wabbajack)

### Installation

Start with a _clean, unmodified_ Skyrim SE installation and at least 120Gb free on your target
drive - we're going to install a _lot_ of textures. Get [_Wabbajack_](https://www.wabbajack.org/)
and feed the modlist to it. This will take a while, but is fully automated. Once done, the output
folder will contain a portable Mod Organizer 2 installation with everything you need to run and
further mod Skyrim.

The only required step after Wabbajack has done its work is to copy the contents of the
`Game Folder Files` folder into your Skyrim SE installation directory, next to the `SkyrimSE.exe`
file.

### Optional Steps

#### Review Installed Mods

This modlist's primary focus is on visuals, but it adds some gameplay content too. Review the mods
under the **Gameplay** and **Content** sections near the top and the **SkyRe** section at the end,
and decide which you want to keep. It's safe to disable all of them without compromising the rest of
the modlist.

Especially consider whether you want to keep
[_Skyrim Unbound_](https://www.nexusmods.com/skyrimspecialedition/mods/27962), which bypasses the
standard opening sequence and lets you get into the game straight away with your choice of gear and
spells. This means there will be _no_ hey you, you're finally awake. If you do keep it, I recommend
you read about how it works, because getting started with it isn't entirely self-explanatory.

You should also consider, if you've kept the survival mods, whether you want to enable
[_Skills of the Wild_](https://www.nexusmods.com/skyrimspecialedition/mods/37693), which is included
but disabled by default, because it may add a bit _too_ much immersion to the game.

You can also pick another main menu replacer from the three provided, or disable them altogether for
the original Skyrim main menu experience.

You should run _zEdit_ afterwards to regenerate the three patch ESPs (`zPatch.esp`,
`ENBLight Patch.esp` and `ReProccer.esp`) for your changed content. If you've disabled _SkyRe_, you
should not generate `ReProccer.esp` in _zEdit_, and you should also disable it in your MO2 plugin
list. The other two are needed by the visual mods, and `zPatch.esp` is also needed by you, as, among
other things, it patches helmets to show Khajiit ears through them, without which the game is
generally a huge disappointment.

Once this is done, go through the plugin list in the MO2 interface and disable any plugins that now
have missing masters, these are patches you no longer need for the content you've disabled.

#### Generate LOD Files

Generated LOD files are not included, but all the tools you need to generate them are. It's
recommended that you do so, or your distant terrain is going to look less than optimal. I won't
detail the process here, find a tutorial on _xLODGen_ and _DynDOLOD_ if you need assistance. You can
launch all the tools through MO2. I recommend you create some empty mods from the MO2 interface to
keep your generated LODs in.

#### Tweak Your ENB

You'll have the "Full Quality" version of
[_Natural View Tamriel ENB_](https://www.nexusmods.com/skyrimspecialedition/mods/11203) set up for
you. You may wish to instead use the "Performance" version, if your GPU isn't keeping up. Download
the _Cathedral Weathers_ variant, extract and copy over the relevant files to your Skyrim game
folder.

### Launching the Game

Launch the game by opening MO2 and running SKSE through it.

Now go meet some dogs!

{{banner(url="dog.webp")}}

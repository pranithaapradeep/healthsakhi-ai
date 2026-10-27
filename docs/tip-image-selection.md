# Health Tips photo selection (review of 2026-10-27)

**Status: selected, NOT installed.** The app still shows the photos from the first fetch. The choices below are
pinned in `backend/scripts/fetch_tip_images.py` (`PINNED` + `PINNED_EXPECT`) and are installed only when you run:

```
cd C:\dev\healthsakhi-ai\backend
.venv\Scripts\python.exe -m scripts.fetch_tip_images --only pinned
```

How the choice was made: every candidate in `tip-image-review/` (the `--review flagged` run) was opened and compared by
eye, together with each tip's English text. Licence and credit come from the Commons API metadata
(`extmetadata` LicenseShortName / Artist) saved in `tip-image-review/candidates.json` at review time. When you run the
install, the script reads that metadata from Commons again and **refuses to install** a slot if the file, licence or
credit differs from what is recorded here (that slot keeps its current photo and the run ends with `CHECK:`).

All selected files are JPEG photos ≥ 1000 px wide under CC0, public domain, CC BY or CC BY-SA, shown resized (500 px) and
unedited. CC BY / BY-SA photos are credited on the card ("Photo: credit · licence · Wikimedia Commons", linking to the
source page).

## Selected photos (22 slots)

| Slot | Chosen candidate | Why it fits | Licence | Credit | Source |
|---|---|---|---|---|---|
| cat:nutrition (tile) | cat-nutrition #6 | Bright yellow and green squash at a market; a simple, cheerful produce image that reads well as a small tile | Public domain | USDAgov | [File:Fruits and Vegetables (20170526-AMS-LSC-0022).jpg](https://commons.wikimedia.org/wiki/File:Fruits_and_Vegetables_(20170526-AMS-LSC-0022).jpg) |
| cat:heartBrain (tile) | cat-heartBrain #2 | Almonds and cashews in a terracotta pot on a clean green background; bright and uncluttered (the old manifest had no photo here) | CC BY 2.0 | NIAID | [File:Bowl of Cashews and Almonds (48140118636).jpg](https://commons.wikimedia.org/wiki/File:Bowl_of_Cashews_and_Almonds_(48140118636).jpg) |
| cat:coldFever (tile) | cat-coldFever #2 | Warm ginger tea with ginger slices and a spoon; replaces a branded lozenge packet | CC BY-SA 4.0 | E.mil.mil | [File:Tea P1000274a.jpg](https://commons.wikimedia.org/wiki/File:Tea_P1000274a.jpg) |
| cat:liverKidney (tile) | alcohol-detox #6 (water search) | A single clear glass of water on a warm background; no face (replaces a photo of a person) | Public domain | Derek Jensen ( Tysto ) | [File:Glass-of-water.jpg](https://commons.wikimedia.org/wiki/File:Glass-of-water.jpg) |
| fruits-vegetables | cat-nutrition #2 | Colourful mix of fruits *and* vegetables on a crate, exactly the tip's message (the old manifest had no photo here) | CC BY-SA 4.0 | PattayaPatrol | [File:DFC 2197 A colorful assortment…wooden crate.jpg](https://commons.wikimedia.org/wiki/File:DFC_2197_A_colorful_assortment_of_fresh_fruits_and_vegetables_-_apples_mango_dragon_fruit_kiwis_limes_bananas_and_more_-_arranged_on_a_wooden_crate.jpg) |
| nuts-seeds | nuts-seeds #1 | Walnuts, pistachios, cashews and almonds neatly arranged on a wooden board; no packaging | CC0 | piviso.com | [File:Walnuts pistachios cashew almonds.jpg](https://commons.wikimedia.org/wiki/File:Walnuts_pistachios_cashew_almonds.jpg) |
| hydration | alcohol-detox #6 (same file as the liverKidney tile) | Clean glass of water; replaces the "fasting" photo (empty plate), which could suggest skipping meals | Public domain | Derek Jensen ( Tysto ) | [File:Glass-of-water.jpg](https://commons.wikimedia.org/wiki/File:Glass-of-water.jpg) |
| physical-activity | physical-activity #1 | Sunny tree-lined walking path, an inviting picture of everyday walking | CC BY 4.0 | Igor123121 | [File:Niepołomickie Błonia Park, walking path…](https://commons.wikimedia.org/wiki/File:Niepo%C5%82omickie_B%C5%82onia_Park,_walking_path,_Niepo%C5%82omice,_Poland.jpg) |
| sleep-brain | sleep-brain #2 | Crisp white bed and pillows, calm and bright; no watermark or timestamp | CC BY-SA 4.0 | Amin | [File:Pillows on a hotel bed.jpg](https://commons.wikimedia.org/wiki/File:Pillows_on_a_hotel_bed.jpg) |
| tulsi | tulsi #5 | Healthy tulsi plant with its flower spike; clearly identifiable | CC BY-SA 3.0 | Joydeep | [File:Ocimum tenuiflorum 24 08 2012.JPG](https://commons.wikimedia.org/wiki/File:Ocimum_tenuiflorum_24_08_2012.JPG) |
| ginger | ginger #6 | Fresh ginger root beside a cup of ginger tea, showing both the ingredient and how it's used | CC BY-SA 4.0 | Trupti.gauns | [File:Ginger Tea .jpg](https://commons.wikimedia.org/wiki/File:Ginger_Tea_.jpg) |
| honey-cough | honey-cough #6 | Honey dripper over a plain glass jar on white; bright and unbranded | CC0 | Matankic | [File:Honey dripper load.jpg](https://commons.wikimedia.org/wiki/File:Honey_dripper_load.jpg) |
| saline-nasal | saline-nasal #3 | Plain, unlabelled spray bottle with a teddy bear; gentle and unbranded (other candidates had Vicks/Alergimist or pharmacy labels; the old photo was a child's hand close-up) | CC BY 2.0 | Shixart1985 | [File:A teddy bear wearing a mask…nasal spray bottle.jpg](https://commons.wikimedia.org/wiki/File:A_teddy_bear_wearing_a_mask_sits_on_a_wooden_table_next_to_a_blue_nasal_spray_bottle.jpg) |
| prunes | prunes #1 | Close-up of dried prunes; clearly prunes (the old photo was a mixed fruit compote) | CC BY-SA 4.0 | Emőke Dénes | [File:Rosales - Dried Prunus domestica d.jpg](https://commons.wikimedia.org/wiki/File:Rosales_-_Dried_Prunus_domestica_d.jpg) |
| gentle-activity | physical-activity #6 | Wide, easy park path under a blue sky, suggesting gentle walking (replaces a carpet-underlay yoga mat) | CC BY 4.0 | John Phelan | [File:Etowah River Park walking path, Canton GA.jpg](https://commons.wikimedia.org/wiki/File:Etowah_River_Park_walking_path,_Canton_GA.jpg) |
| warm-lemon-ginger-water | ginger #1 | A warm glass of ginger tea with lemon; the old photo was *ice* water, which contradicts "warm" | CC BY 2.0 | Gleb from St.Petersburg, Russia | [File:Ginger tea-01.jpg](https://commons.wikimedia.org/wiki/File:Ginger_tea-01.jpg) |
| scalp-massage | scalp-massage #1 | Bottle of coconut oil among coconuts; simple generic "COCONUT OIL" label, no brand | CC BY-SA 4.0 | deadrat | [File:Coconut oil bottle…Kaleeswari Farm.jpg](https://commons.wikimedia.org/wiki/File:Coconut_oil_bottle_in_the_background_of_coconuts_from_Kaleeswari_Farm.jpg) |
| hibiscus-hair | hibiscus-hair #3 | Pink hibiscus flower with its leaves (the tip uses both); the old photo showed a leaf only | CC BY-SA 3.0 | Vengolis | [File:Hibiscus rosa-sinensis 22.jpg](https://commons.wikimedia.org/wiki/File:Hibiscus_rosa-sinensis_22.jpg) |
| aloe-vera | aloe-vera #1 | Cut aloe leaf showing the inner gel, on a light surface | CC BY 2.0 | Rae Allen | [File:Cut Aloe Vera Leaf.jpg](https://commons.wikimedia.org/wiki/File:Cut_Aloe_Vera_Leaf.jpg) |
| gentle-skin-care | gentle-skin-care #2 | A plain dollop of white cream on a glass dish; no brand (Aveeno/Equate candidates rejected) | CC BY-SA 4.0 | Benff | [File:Lotion 02.jpg](https://commons.wikimedia.org/wiki/File:Lotion_02.jpg) |
| kidney-fluids | alcohol-detox #5 (water search) | A glass of drinking water on a table; replaces a cut-out PNG bottle | CC0 | Kurt Kaiser | [File:Glass of water ouside.jpg](https://commons.wikimedia.org/wiki/File:Glass_of_water_ouside.jpg) |
| alcohol-detox | alcohol-detox #2 | A glass of water. The old herbal-tea photo contradicted the tip, which says to choose water instead of detox teas | CC0 | W.carter | [File:Blue glass with carbonated water.jpg](https://commons.wikimedia.org/wiki/File:Blue_glass_with_carbonated_water.jpg) |

## Flagged slots kept as they are

| Slot | Decision | Reason |
|---|---|---|
| leafy-greens | Keep current (File:Fresh Spinach leaves.jpg, CC BY-SA 4.0) | The current photo is the best candidate (it is review #3); #1 has a supermarket sticker |
| hair-skin-doctor | Keep current (File:Dermatoscope1.JPG, CC BY-SA 3.0) | Same as review #1; other candidates were a melanoma close-up (rejected as alarming) or generic stethoscopes |
| rest-hydration-fever | Keep current (File:Tender coconut water 02.jpg, CC BY-SA 4.0) | No review candidate fits (they were bedside tables, lamps and old prints). The current photo matches its alt text. Manual-review note: the coconut shown is a mature brown one rather than a green tender coconut |
| whole-grains-lentils | Keep current (dal, CC BY-SA 2.0) | No candidate was clearer |

No slot needs the illustrated fallback: every slot has a suitable photo.

## Rejected during review (examples)

Branded products (Aveeno, Equate, Vicks, Biofar, Prunesso, Alergimist, Ryukakusan), watermarked or timestamped
photos (sleep #3/#4, heartBrain #1), a melanoma close-up (hair-skin-doctor #5), photos of people's faces, and the
"fasting" water photo.

## Needs your eye after install

- **Shared file:** `hydration` and the `cat:liverKidney` tile use the same water-glass photo (each slot gets its own
  copy). They sit in different categories, but in the "All" view both are visible.
- **saline-nasal:** the teddy bear wears a face mask; it reads as "a cold at home", but check you're happy with the tone.
- **rest-hydration-fever:** brown coconut (see above).

## Alt text to update when the photos are installed (not applied yet)

`tipImageAlt.ts` is unchanged for now, as asked. Once the final download is verified, these slots need new alt text so
it describes the new photo (the others still match):

| Slot | English | Tamil | Hindi |
|---|---|---|---|
| cat:nutrition | Colourful fresh squash at a market | சந்தையில் வண்ணமயமான புதிய பூசணி வகைகள் | बाज़ार में रंग-बिरंगे ताज़े कद्दू |
| cat:heartBrain | A bowl of almonds and cashews | பாதாம், முந்திரி நிறைந்த ஒரு கிண்ணம் | बादाम और काजू से भरा एक कटोरा |
| cat:coldFever | A cup of warm ginger tea | ஒரு கோப்பை சூடான இஞ்சி டீ | गरम अदरक की चाय का एक कप |
| fruits-vegetables | Fresh fruits and vegetables on a wooden crate | மரப்பெட்டியில் புதிய பழங்களும் காய்கறிகளும் | लकड़ी के क्रेट पर ताज़े फल और सब्ज़ियाँ |
| physical-activity | A tree-lined walking path | மரங்கள் சூழ்ந்த நடைபாதை | पेड़ों से घिरा पैदल रास्ता |
| gentle-activity | A walking path in a green park | பசுமையான பூங்காவில் ஒரு நடைபாதை | हरे-भरे पार्क में पैदल चलने का रास्ता |
| ginger | Fresh ginger root and a cup of ginger tea | புதிய இஞ்சியும் ஒரு கோப்பை இஞ்சி டீயும் | ताज़ा अदरक और अदरक की चाय का कप |
| honey-cough | A jar of honey with a honey dipper | தேன் கரண்டியுடன் ஒரு தேன் ஜாடி | शहद की डंडी के साथ शहद का जार |
| saline-nasal | A nasal spray bottle next to a toy teddy bear | பொம்மைக் கரடிக்கு அருகில் ஒரு மூக்கு ஸ்ப்ரே பாட்டில் | खिलौना भालू के पास नाक के स्प्रे की बोतल |
| prunes | A heap of dried prunes | உலர்ந்த ப்ரூன் பழங்களின் குவியல் | सूखे आलूबुख़ारों का ढेर |
| warm-lemon-ginger-water | A glass of warm lemon and ginger drink | எலுமிச்சை, இஞ்சி சேர்த்த சூடான பானம் ஒரு டம்ளர் | नींबू और अदरक वाले गरम पेय का गिलास |
| scalp-massage | A bottle of coconut oil with coconuts | தேங்காய்களுடன் ஒரு தேங்காய் எண்ணெய் பாட்டில் | नारियलों के साथ नारियल तेल की बोतल |
| gentle-skin-care | A dollop of plain white skin cream | சிறிதளவு வெள்ளை சரும க்ரீம் | सादी सफ़ेद त्वचा क्रीम की थोड़ी मात्रा |
| kidney-fluids | A glass of drinking water | ஒரு டம்ளர் குடிநீர் | पीने के पानी का एक गिलास |
| alcohol-detox | A glass of water | ஒரு டம்ளர் தண்ணீர் | पानी का एक गिलास |

// Health tip content in English, Tamil and Hindi — kept separate from the page so it is easy to review and edit.
//
// Rules for anyone editing this file (checked by healthTips.test.ts):
// - General education only: never claim that a food or herb cures, detoxifies or replaces medical care.
// - Label honestly: 'food' (everyday food or drink), 'traditional' (Ayurveda/Siddha use; benefits not established),
//   'limited' (some research, but weak or mixed), 'habit' (everyday self-care or when-to-see-a-doctor advice).
// - Include a safety note for risks: pregnancy, children, long-term illness, prescription medicines.
// Translations should be reviewed by native Tamil and Hindi speakers before release.
import type { HealthTip, Localized } from './tipTypes'

export * from './tipTypes'

const L = (en: string, ta: string, hi: string): Localized => ({ en, ta, hi })

export const HEALTH_TIPS: HealthTip[] = [
  {
    id: "fruits-vegetables",
    category: "nutrition",
    evidence: "food",
    keywords: ["fruit", "vegetable", "sabzi", "vitamins"],
    title: L(
      "Eat a rainbow of fruits and vegetables",
      "பல நிற பழங்கள், காய்கறிகளைச் சாப்பிடுங்கள்",
      "रंग-बिरंगे फल और सब्ज़ियाँ खाएँ",
    ),
    summary: L(
      "Fruits and vegetables give vitamins, minerals and fibre. Different colours give different nutrients.",
      "பழங்களும் காய்கறிகளும் வைட்டமின்கள், தாதுக்கள், நார்ச்சத்து தருகின்றன. வெவ்வேறு நிறங்கள் வெவ்வேறு சத்துகளைத் தரும்.",
      "फल और सब्ज़ियाँ विटामिन, खनिज और फ़ाइबर देते हैं। अलग-अलग रंग अलग-अलग पोषक तत्व देते हैं।",
    ),
    suggestion: L(
      "Seasonal local produce: guava, banana, papaya, spinach, carrots, tomatoes, beans.",
      "பருவகால உள்ளூர் விளைபொருள்கள்: கொய்யா, வாழைப்பழம், பப்பாளி, கீரை, கேரட், தக்காளி, பீன்ஸ்.",
      "मौसमी स्थानीय उपज: अमरूद, केला, पपीता, पालक, गाजर, टमाटर, बीन्स।",
    ),
    howTo: L(
      "Aim for about 5 servings a day — for example, a fruit with breakfast and vegetables at lunch and dinner. Wash well before eating.",
      "நாளொன்றுக்கு சுமார் 5 பங்குகள் — உதாரணமாக காலை உணவுடன் ஒரு பழம், மதியமும் இரவும் காய்கறிகள். சாப்பிடும் முன் நன்கு கழுவுங்கள்.",
      "रोज़ लगभग 5 हिस्से लें — जैसे नाश्ते में एक फल और दोपहर व रात के खाने में सब्ज़ियाँ। खाने से पहले अच्छी तरह धोएँ।",
    ),
    safety: L(
      "People with kidney disease may need to limit high-potassium foods such as banana — follow your doctor's or dietitian's advice.",
      "சிறுநீரக நோய் உள்ளவர்கள் வாழைப்பழம் போன்ற அதிக பொட்டாசியம் உணவுகளைக் குறைக்க வேண்டியிருக்கலாம் — மருத்துவர் அல்லது உணவியல் நிபுணரின் ஆலோசனையைப் பின்பற்றுங்கள்.",
      "किडनी रोग वाले लोगों को केले जैसे ज़्यादा पोटैशियम वाले खाद्य पदार्थ सीमित करने पड़ सकते हैं — अपने डॉक्टर या डाइटीशियन की सलाह मानें।",
    ),
    more: L(
      "Whole fruit is better than juice because it keeps the fibre. Frozen vegetables without added salt also count. Fruits and vegetables support overall health as part of a varied diet; no single food prevents disease.",
      "சாற்றை விட முழுப் பழம் சிறந்தது, ஏனெனில் அதில் நார்ச்சத்து இருக்கிறது. உப்பு சேர்க்காத உறைந்த காய்கறிகளும் கணக்கில் வரும். பல்வகை உணவின் ஒரு பகுதியாக இவை ஒட்டுமொத்த உடல்நலத்திற்கு உதவுகின்றன; எந்த ஒரு உணவும் நோயைத் தடுக்காது.",
      "जूस से बेहतर पूरा फल है, क्योंकि उसमें फ़ाइबर बना रहता है। बिना नमक वाली फ़्रोज़न सब्ज़ियाँ भी गिनी जाती हैं। विविध आहार के हिस्से के रूप में ये समग्र स्वास्थ्य में मदद करते हैं; कोई एक भोजन बीमारी नहीं रोकता।",
    ),
  },
  {
    id: "whole-grains-lentils",
    category: "nutrition",
    evidence: "food",
    keywords: ["millet", "ragi", "dal", "pulses", "rice", "roti"],
    title: L(
      "Choose whole grains and lentils",
      "முழு தானியங்களும் பருப்புகளும் தேர்ந்தெடுங்கள்",
      "साबुत अनाज और दालें चुनें",
    ),
    summary: L(
      "Whole grains and pulses give lasting energy, fibre and plant protein.",
      "முழு தானியங்களும் பருப்பு வகைகளும் நீடித்த ஆற்றல், நார்ச்சத்து, தாவரப் புரதம் தருகின்றன.",
      "साबुत अनाज और दालें लंबे समय तक ऊर्जा, फ़ाइबर और वनस्पति प्रोटीन देती हैं।",
    ),
    suggestion: L(
      "Millets (ragi, bajra, jowar), brown or hand-pounded rice, whole-wheat roti, dal, chana, rajma.",
      "சிறுதானியங்கள் (கேழ்வரகு, கம்பு, சோளம்), கைக்குத்தல் அரிசி, கோதுமைச் சப்பாத்தி, பருப்பு, கொண்டைக்கடலை, ராஜ்மா.",
      "मोटे अनाज (रागी, बाजरा, ज्वार), ब्राउन या हाथ-कुटा चावल, गेहूँ की रोटी, दाल, चना, राजमा।",
    ),
    howTo: L(
      "Swap part of your white rice or maida for a whole grain, and include a dal or legume in at least one meal a day.",
      "வெள்ளை அரிசி அல்லது மைதாவின் ஒரு பகுதிக்கு பதிலாக முழு தானியத்தைப் பயன்படுத்துங்கள்; தினமும் குறைந்தது ஒரு வேளையில் பருப்பு அல்லது பயறு சேர்த்துக்கொள்ளுங்கள்.",
      "सफ़ेद चावल या मैदे का कुछ हिस्सा साबुत अनाज से बदलें, और दिन में कम से कम एक भोजन में दाल या फली शामिल करें।",
    ),
    safety: L(
      "Add them gradually and drink enough water to avoid bloating.",
      "வயிற்று உப்புசம் தவிர்க்க படிப்படியாகச் சேர்த்து, போதுமான தண்ணீர் குடியுங்கள்.",
      "पेट फूलने से बचने के लिए धीरे-धीरे शामिल करें और पर्याप्त पानी पिएँ।",
    ),
    more: L(
      "Combining cereals with pulses — like idli, dosa, khichdi or dal-rice — gives better quality protein. Soaking and cooking pulses well makes them easier to digest.",
      "தானியங்களைப் பருப்புடன் சேர்ப்பது — இட்லி, தோசை, கிச்சடி, பருப்பு சாதம் போல — சிறந்த தரமான புரதம் தரும். பருப்புகளை ஊறவைத்து நன்கு வேகவைத்தால் எளிதில் செரிக்கும்.",
      "अनाज को दाल के साथ मिलाने से — जैसे इडली, डोसा, खिचड़ी या दाल-चावल — बेहतर गुणवत्ता का प्रोटीन मिलता है। दालों को भिगोकर अच्छी तरह पकाने से वे आसानी से पचती हैं।",
    ),
  },
  {
    id: "nuts-seeds",
    category: "nutrition",
    evidence: "food",
    keywords: ["almond", "peanut", "sesame", "til", "flaxseed"],
    title: L(
      "A small handful of nuts and seeds",
      "ஒரு சிறு கைப்பிடி கொட்டைகளும் விதைகளும்",
      "मुट्ठी भर मेवे और बीज",
    ),
    summary: L(
      "Nuts and seeds provide healthy fats, protein, fibre and minerals.",
      "கொட்டைகளும் விதைகளும் நல்ல கொழுப்பு, புரதம், நார்ச்சத்து, தாதுக்கள் தருகின்றன.",
      "मेवे और बीज अच्छी वसा, प्रोटीन, फ़ाइबर और खनिज देते हैं।",
    ),
    suggestion: L(
      "Unsalted peanuts, almonds, walnuts, sesame (til), flaxseed, sunflower or pumpkin seeds.",
      "உப்பில்லாத வேர்க்கடலை, பாதாம், வால்நட், எள், ஆளி விதை, சூரியகாந்தி அல்லது பூசணி விதைகள்.",
      "बिना नमक वाली मूँगफली, बादाम, अखरोट, तिल, अलसी, सूरजमुखी या कद्दू के बीज।",
    ),
    howTo: L(
      "About a small handful (around 30 g) a day, as a snack or sprinkled on curd, salad or porridge.",
      "நாளொன்றுக்கு சுமார் ஒரு சிறு கைப்பிடி (சுமார் 30 கிராம்) — சிற்றுண்டியாகவோ, தயிர், சாலட், கஞ்சியில் தூவியோ.",
      "रोज़ लगभग एक छोटी मुट्ठी (करीब 30 ग्राम) — नाश्ते के रूप में या दही, सलाद या दलिया पर छिड़ककर।",
    ),
    safety: L(
      "Nut allergy can be serious — avoid nuts if you are allergic. Whole nuts can choke young children; give them ground or as a paste.",
      "கொட்டை ஒவ்வாமை தீவிரமாக இருக்கலாம் — ஒவ்வாமை இருந்தால் தவிர்க்கவும். முழுக் கொட்டைகள் சிறு குழந்தைகளுக்குத் தொண்டையில் சிக்கலாம்; அரைத்தோ விழுதாகவோ கொடுங்கள்.",
      "मेवों से एलर्जी गंभीर हो सकती है — एलर्जी हो तो न खाएँ। साबुत मेवे छोटे बच्चों के गले में अटक सकते हैं; उन्हें पीसकर या पेस्ट बनाकर दें।",
    ),
    more: L(
      "Nuts are energy-dense, so a small portion is enough. Choose plain or dry-roasted nuts instead of salted, fried or sugar-coated ones.",
      "கொட்டைகளில் கலோரி அதிகம், எனவே சிறிய அளவே போதும். உப்பு, எண்ணெயில் வறுத்தவை, சர்க்கரைப் பூச்சு உள்ளவற்றை விட வெறுமையானவை அல்லது எண்ணெயின்றி வறுத்தவை சிறந்தவை.",
      "मेवों में कैलोरी ज़्यादा होती है, इसलिए थोड़ी मात्रा काफ़ी है। नमकीन, तले या चीनी-लेपित मेवों की जगह सादे या बिना तेल के भुने मेवे चुनें।",
    ),
  },
  {
    id: "hydration",
    category: "nutrition",
    evidence: "food",
    keywords: ["water", "drink", "buttermilk", "chaas", "coconut water"],
    title: L(
      "Drink enough water through the day",
      "நாள் முழுவதும் போதுமான தண்ணீர் குடியுங்கள்",
      "दिन भर पर्याप्त पानी पिएँ",
    ),
    summary: L(
      "Water helps digestion, temperature control and kidney function. Needs rise in hot weather and with exercise.",
      "தண்ணீர் செரிமானம், உடல் வெப்பநிலைக் கட்டுப்பாடு, சிறுநீரகச் செயல்பாட்டுக்கு உதவுகிறது. வெயிலிலும் உடற்பயிற்சியின் போதும் தேவை அதிகரிக்கும்.",
      "पानी पाचन, शरीर के तापमान और किडनी के काम में मदद करता है। गर्मी और व्यायाम में ज़रूरत बढ़ जाती है।",
    ),
    suggestion: L(
      "Plain water, buttermilk (mor/chaas), coconut water, lemon water without much sugar.",
      "வெற்றுத் தண்ணீர், மோர், இளநீர், அதிக சர்க்கரை இல்லாத எலுமிச்சைத் தண்ணீர்.",
      "सादा पानी, छाछ, नारियल पानी, कम चीनी वाला नींबू पानी।",
    ),
    howTo: L(
      "Sip regularly; pale-yellow urine is a simple sign you are drinking enough. Limit sugary drinks.",
      "சீராக அடிக்கடி குடியுங்கள்; வெளிர் மஞ்சள் சிறுநீர் போதுமான அளவு குடிப்பதற்கான எளிய அறிகுறி. இனிப்புப் பானங்களைக் குறையுங்கள்.",
      "थोड़ा-थोड़ा करके नियमित पिएँ; हल्के पीले रंग का पेशाब पर्याप्त पानी का आसान संकेत है। मीठे पेय कम करें।",
    ),
    safety: L(
      "If you have kidney, heart or liver disease or a prescribed fluid limit, follow your clinician's advice on how much to drink.",
      "சிறுநீரகம், இதயம் அல்லது கல்லீரல் நோய் இருந்தால் அல்லது திரவக் கட்டுப்பாடு பரிந்துரைக்கப்பட்டிருந்தால், எவ்வளவு குடிக்க வேண்டும் என்பதில் உங்கள் மருத்துவரின் ஆலோசனையைப் பின்பற்றுங்கள்.",
      "अगर आपको किडनी, दिल या लिवर की बीमारी है या तरल की सीमा तय की गई है, तो कितना पीना है इस पर अपने डॉक्टर की सलाह मानें।",
    ),
    more: L(
      "Older adults may not feel thirsty even when they need fluids, so regular sips help. Coconut water is high in potassium — ask your doctor if you have kidney disease.",
      "முதியவர்களுக்கு தேவை இருந்தாலும் தாகம் தெரியாமல் போகலாம், எனவே சீராகக் குடிப்பது உதவும். இளநீரில் பொட்டாசியம் அதிகம் — சிறுநீரக நோய் இருந்தால் மருத்துவரிடம் கேளுங்கள்.",
      "बुज़ुर्गों को ज़रूरत होने पर भी प्यास कम लग सकती है, इसलिए नियमित घूँट मदद करते हैं। नारियल पानी में पोटैशियम ज़्यादा होता है — किडनी रोग हो तो डॉक्टर से पूछें।",
    ),
  },
  {
    id: "balanced-plate",
    category: "nutrition",
    evidence: "food",
    keywords: ["thali", "meal", "protein", "diet"],
    title: L(
      "Build a balanced plate",
      "சமச்சீரான தட்டை அமையுங்கள்",
      "संतुलित थाली बनाएँ",
    ),
    summary: L(
      "A balanced meal mixes vegetables, a whole grain, a protein source and a little healthy fat.",
      "சமச்சீரான உணவில் காய்கறிகள், ஒரு முழு தானியம், ஒரு புரத உணவு, சிறிதளவு நல்ல கொழுப்பு இருக்கும்.",
      "संतुलित भोजन में सब्ज़ियाँ, एक साबुत अनाज, एक प्रोटीन स्रोत और थोड़ी अच्छी वसा होती है।",
    ),
    suggestion: L(
      "Half the plate vegetables, a quarter grains (rice, roti, millet), a quarter dal, egg, fish, paneer or curd.",
      "தட்டில் பாதி காய்கறிகள், கால் பங்கு தானியம் (சோறு, சப்பாத்தி, சிறுதானியம்), கால் பங்கு பருப்பு, முட்டை, மீன், பனீர் அல்லது தயிர்.",
      "आधी थाली सब्ज़ियाँ, चौथाई अनाज (चावल, रोटी, मोटा अनाज), चौथाई दाल, अंडा, मछली, पनीर या दही।",
    ),
    howTo: L(
      "Eat at regular times, use less salt, sugar and deep-fried food, and cook with a small amount of oil.",
      "சீரான நேரங்களில் சாப்பிடுங்கள்; உப்பு, சர்க்கரை, பொரித்த உணவுகளைக் குறையுங்கள்; குறைந்த எண்ணெயில் சமையுங்கள்.",
      "नियमित समय पर खाएँ, नमक, चीनी और तली चीज़ें कम करें, और कम तेल में पकाएँ।",
    ),
    safety: L(
      "If you have diabetes, kidney disease or another condition with a special diet, follow the plan from your doctor or dietitian.",
      "நீரிழிவு, சிறுநீரக நோய் அல்லது சிறப்பு உணவுமுறை தேவைப்படும் வேறு நோய் இருந்தால், உங்கள் மருத்துவர் அல்லது உணவியல் நிபுணர் தந்த திட்டத்தைப் பின்பற்றுங்கள்.",
      "मधुमेह, किडनी रोग या किसी ऐसी बीमारी में जिसमें ख़ास आहार चाहिए, अपने डॉक्टर या डाइटीशियन की योजना मानें।",
    ),
    more: L(
      "Traditional meals like sambar-rice with poriyal, or dal-roti-sabzi with curd, already follow this pattern. Children, pregnant women and older adults have different needs — a doctor or dietitian can guide portions.",
      "சாம்பார் சாதம் பொரியலுடன், அல்லது பருப்பு-சப்பாத்தி-காய்கறி தயிருடன் போன்ற பாரம்பரிய உணவுகள் ஏற்கெனவே இந்த முறையில் உள்ளன. குழந்தைகள், கர்ப்பிணிகள், முதியவர்களின் தேவைகள் வேறுபடும் — அளவுகளை மருத்துவர் அல்லது உணவியல் நிபுணர் வழிகாட்டலாம்.",
      "सांभर-चावल के साथ पोरियल, या दाल-रोटी-सब्ज़ी के साथ दही जैसे पारंपरिक भोजन पहले से इसी तरीके पर हैं। बच्चों, गर्भवती महिलाओं और बुज़ुर्गों की ज़रूरतें अलग होती हैं — मात्रा के लिए डॉक्टर या डाइटीशियन मार्गदर्शन कर सकते हैं।",
    ),
  },
  {
    id: "oats-whole-grains",
    category: "heartBrain",
    evidence: "food",
    keywords: ["oats", "barley", "cholesterol", "fibre"],
    title: L(
      "Oats and other whole grains for the heart",
      "இதயத்துக்கு ஓட்ஸ் மற்றும் பிற முழு தானியங்கள்",
      "दिल के लिए ओट्स और अन्य साबुत अनाज",
    ),
    summary: L(
      "Oats and barley contain soluble fibre (beta-glucan), which can help lower LDL cholesterol as part of a healthy diet.",
      "ஓட்ஸ், பார்லியில் கரையும் நார்ச்சத்து (பீட்டா-குளுக்கன்) உள்ளது; ஆரோக்கியமான உணவின் பகுதியாக இது LDL கொழுப்பைக் குறைக்க உதவலாம்.",
      "ओट्स और जौ में घुलनशील फ़ाइबर (बीटा-ग्लूकन) होता है, जो स्वस्थ आहार के हिस्से के रूप में LDL कोलेस्ट्रॉल कम करने में मदद कर सकता है।",
    ),
    suggestion: L(
      "Oats porridge or upma, barley, ragi, millets, whole-wheat roti.",
      "ஓட்ஸ் கஞ்சி அல்லது உப்புமா, பார்லி, கேழ்வரகு, சிறுதானியங்கள், கோதுமைச் சப்பாத்தி.",
      "ओट्स का दलिया या उपमा, जौ, रागी, मोटे अनाज, गेहूँ की रोटी।",
    ),
    howTo: L(
      "Choose plain oats, cook them with vegetables or milk, and avoid adding much sugar or salt.",
      "வெறும் ஓட்ஸைத் தேர்ந்தெடுத்து காய்கறிகள் அல்லது பாலுடன் சமையுங்கள்; அதிக சர்க்கரை, உப்பு சேர்க்காதீர்கள்.",
      "सादे ओट्स चुनें, सब्ज़ियों या दूध के साथ पकाएँ, और ज़्यादा चीनी या नमक न डालें।",
    ),
    safety: L(
      "Food helps but does not replace cholesterol or blood-pressure medicines. Do not stop prescribed medicines.",
      "உணவு உதவும், ஆனால் கொழுப்பு அல்லது இரத்த அழுத்த மருந்துகளுக்கு மாற்றாகாது. பரிந்துரைக்கப்பட்ட மருந்துகளை நிறுத்தாதீர்கள்.",
      "भोजन मदद करता है, लेकिन कोलेस्ट्रॉल या ब्लड प्रेशर की दवाओं की जगह नहीं लेता। डॉक्टर की दी हुई दवाएँ बंद न करें।",
    ),
    more: L(
      "Flavoured instant oats often contain added sugar and salt — check the label. The benefit comes from regular intake over time, together with activity and not smoking.",
      "சுவையூட்டப்பட்ட உடனடி ஓட்ஸில் பெரும்பாலும் சர்க்கரையும் உப்பும் சேர்க்கப்பட்டிருக்கும் — லேபிளைச் சரிபாருங்கள். பயன், உடற்பயிற்சி மற்றும் புகைபிடிக்காமையுடன் சேர்ந்து, நீண்ட காலம் தொடர்ந்து உண்பதால் வரும்.",
      "फ़्लेवर वाले इंस्टेंट ओट्स में अक्सर चीनी और नमक मिला होता है — लेबल देखें। फ़ायदा नियमित सेवन से, व्यायाम और धूम्रपान न करने के साथ, समय के साथ मिलता है।",
    ),
  },
  {
    id: "leafy-greens",
    category: "heartBrain",
    evidence: "food",
    keywords: ["spinach", "palak", "keerai", "methi", "moringa", "greens"],
    title: L(
      "Leafy greens several times a week",
      "வாரத்தில் பலமுறை கீரைகள்",
      "हफ़्ते में कई बार हरी पत्तेदार सब्ज़ियाँ",
    ),
    summary: L(
      "Greens provide folate, vitamin K, nitrates and antioxidants that support heart and brain health as part of a balanced diet.",
      "கீரைகள் ஃபோலேட், வைட்டமின் K, நைட்ரேட்டுகள், ஆன்டிஆக்ஸிடன்ட்களைத் தருகின்றன; சமச்சீர் உணவின் பகுதியாக இதய, மூளை நலத்துக்கு உதவுகின்றன.",
      "हरी सब्ज़ियाँ फ़ोलेट, विटामिन K, नाइट्रेट और एंटीऑक्सीडेंट देती हैं, जो संतुलित आहार के हिस्से के रूप में दिल और दिमाग़ की सेहत में मदद करती हैं।",
    ),
    suggestion: L(
      "Spinach (palak), amaranth (keerai/chaulai), methi, drumstick (moringa) leaves, curry leaves.",
      "பசலைக் கீரை, முளைக்கீரை/அரைக்கீரை, வெந்தயக் கீரை, முருங்கைக் கீரை, கறிவேப்பிலை.",
      "पालक, चौलाई, मेथी, सहजन (मोरिंगा) की पत्तियाँ, करी पत्ता।",
    ),
    howTo: L(
      "Wash thoroughly, cook lightly in dal, poriyal or sabzi, and add a little lemon to help iron absorption.",
      "நன்கு கழுவி, பருப்பு, பொரியல் அல்லது கூட்டில் லேசாக வேகவையுங்கள்; இரும்புச்சத்து உறிஞ்சப்பட சிறிது எலுமிச்சை சேருங்கள்.",
      "अच्छी तरह धोकर दाल या सब्ज़ी में हल्का पकाएँ, और आयरन के अवशोषण के लिए थोड़ा नींबू डालें।",
    ),
    safety: L(
      "If you take warfarin, keep the amount of greens steady from week to week and tell your doctor about big diet changes. People with kidney stones or kidney disease should ask about high-oxalate or high-potassium greens like spinach.",
      "வார்ஃபரின் மருந்து எடுத்தால், வாரந்தோறும் கீரையின் அளவை ஒரே மாதிரி வைத்து, பெரிய உணவு மாற்றங்களை மருத்துவரிடம் சொல்லுங்கள். சிறுநீரகக் கல் அல்லது சிறுநீரக நோய் உள்ளவர்கள் பசலை போன்ற ஆக்சலேட், பொட்டாசியம் அதிகமுள்ள கீரைகள் பற்றி மருத்துவரிடம் கேளுங்கள்.",
      "अगर आप वारफ़रिन लेते हैं, तो हर हफ़्ते हरी सब्ज़ियों की मात्रा एक जैसी रखें और आहार में बड़े बदलाव डॉक्टर को बताएँ। किडनी स्टोन या किडनी रोग वाले लोग पालक जैसी ज़्यादा ऑक्सलेट या पोटैशियम वाली सब्ज़ियों के बारे में डॉक्टर से पूछें।",
    ),
    more: L(
      "Vitamin K in greens affects how warfarin works, which is why a steady intake matters more than avoiding greens. Clean greens carefully to remove soil and insects.",
      "கீரைகளில் உள்ள வைட்டமின் K, வார்ஃபரின் செயல்படும் விதத்தைப் பாதிக்கும்; அதனால்தான் கீரையைத் தவிர்ப்பதை விட சீரான அளவே முக்கியம். மண், பூச்சிகள் நீங்க கீரைகளைக் கவனமாகச் சுத்தம் செய்யுங்கள்.",
      "हरी सब्ज़ियों का विटामिन K वारफ़रिन के असर को प्रभावित करता है, इसलिए उन्हें छोड़ने से ज़्यादा ज़रूरी है मात्रा एक जैसी रखना। मिट्टी और कीड़े हटाने के लिए पत्तियाँ ध्यान से साफ़ करें।",
    ),
  },
  {
    id: "walnuts-nuts",
    category: "heartBrain",
    evidence: "food",
    keywords: ["walnut", "akhrot", "almond", "omega-3"],
    title: L(
      "Walnuts and other unsalted nuts",
      "வால்நட் மற்றும் உப்பில்லாத பிற கொட்டைகள்",
      "अखरोट और अन्य बिना नमक वाले मेवे",
    ),
    summary: L(
      "Regularly eating a small amount of nuts is linked with better heart health. Walnuts also contain plant omega-3 fat.",
      "சிறிதளவு கொட்டைகளைத் தொடர்ந்து சாப்பிடுவது நல்ல இதய நலத்துடன் தொடர்புடையது. வால்நட்டில் தாவர ஒமேகா-3 கொழுப்பும் உள்ளது.",
      "थोड़ी मात्रा में मेवे नियमित खाना दिल की बेहतर सेहत से जुड़ा है। अखरोट में वनस्पति ओमेगा-3 वसा भी होती है।",
    ),
    suggestion: L(
      "Walnuts, almonds, unsalted peanuts, flaxseed.",
      "வால்நட், பாதாம், உப்பில்லாத வேர்க்கடலை, ஆளி விதை.",
      "अखरोट, बादाम, बिना नमक वाली मूँगफली, अलसी।",
    ),
    howTo: L(
      "A small handful (about 30 g) most days, instead of fried or salty snacks.",
      "பொரித்த அல்லது உப்பான தின்பண்டங்களுக்கு பதிலாக, பெரும்பாலான நாட்களில் ஒரு சிறு கைப்பிடி (சுமார் 30 கிராம்).",
      "तले या नमकीन नाश्ते की जगह, ज़्यादातर दिनों में एक छोटी मुट्ठी (करीब 30 ग्राम)।",
    ),
    safety: L(
      "Avoid nuts if you have a nut allergy. Salted nuts add sodium, which can raise blood pressure.",
      "கொட்டை ஒவ்வாமை இருந்தால் தவிர்க்கவும். உப்புக் கொட்டைகள் சோடியத்தைச் சேர்த்து இரத்த அழுத்தத்தை உயர்த்தலாம்.",
      "मेवों से एलर्जी हो तो न खाएँ। नमकीन मेवों से सोडियम बढ़ता है, जो ब्लड प्रेशर बढ़ा सकता है।",
    ),
    more: L(
      "Studies link nut intake with heart health, but they show an association, not a guarantee. Nuts work best as a swap for less healthy snacks, not as an extra on top.",
      "ஆய்வுகள் கொட்டைகளை இதய நலத்துடன் தொடர்புபடுத்துகின்றன, ஆனால் அது தொடர்பு மட்டுமே, உத்தரவாதம் அல்ல. ஆரோக்கியமற்ற தின்பண்டங்களுக்கு மாற்றாகச் சாப்பிடும்போதே சிறப்பாகப் பயன்தரும்.",
      "अध्ययन मेवों को दिल की सेहत से जोड़ते हैं, पर यह संबंध है, गारंटी नहीं। मेवे कम स्वस्थ नाश्ते की जगह खाने पर सबसे अच्छा काम करते हैं, ऊपर से अतिरिक्त नहीं।",
    ),
  },
  {
    id: "physical-activity",
    category: "heartBrain",
    evidence: "habit",
    keywords: ["exercise", "walking", "yoga", "activity"],
    title: L(
      "Move your body regularly",
      "உடலைத் தொடர்ந்து இயக்குங்கள்",
      "शरीर को नियमित रूप से सक्रिय रखें",
    ),
    summary: L(
      "Regular activity strengthens the heart, helps blood pressure, blood sugar and mood, and supports memory.",
      "தொடர்ந்த உடற்செயல்பாடு இதயத்தை வலுப்படுத்தும்; இரத்த அழுத்தம், இரத்தச் சர்க்கரை, மனநிலைக்கு உதவும்; நினைவாற்றலுக்கும் துணைபுரியும்.",
      "नियमित गतिविधि दिल को मज़बूत करती है, ब्लड प्रेशर, ब्लड शुगर और मूड में मदद करती है, और याददाश्त को सहारा देती है।",
    ),
    suggestion: L(
      "Brisk walking, cycling, yoga, dancing, household work, climbing stairs.",
      "வேகமான நடை, சைக்கிள் ஓட்டுதல், யோகா, நடனம், வீட்டு வேலைகள், படி ஏறுதல்.",
      "तेज़ चलना, साइकिल चलाना, योग, नृत्य, घर के काम, सीढ़ियाँ चढ़ना।",
    ),
    howTo: L(
      "Build up to about 150 minutes a week of moderate activity (for example 30 minutes on 5 days), plus some strength exercise twice a week.",
      "வாரத்துக்கு சுமார் 150 நிமிடங்கள் மிதமான செயல்பாடு வரை படிப்படியாக உயர்த்துங்கள் (உதா: 5 நாட்கள், 30 நிமிடம்); வாரம் இருமுறை தசை வலுப் பயிற்சியும் செய்யுங்கள்.",
      "धीरे-धीरे हफ़्ते में लगभग 150 मिनट की मध्यम गतिविधि तक पहुँचें (जैसे 5 दिन, 30 मिनट), और हफ़्ते में दो बार ताक़त वाले व्यायाम करें।",
    ),
    safety: L(
      "If you have heart disease, chest pain or are starting after a long break, check with your doctor first. Stop and call 112 if you get chest pain, severe breathlessness or fainting.",
      "இதய நோய், நெஞ்சு வலி இருந்தால் அல்லது நீண்ட இடைவெளிக்குப் பிறகு தொடங்கினால், முதலில் மருத்துவரிடம் கேளுங்கள். நெஞ்சு வலி, கடும் மூச்சுத் திணறல் அல்லது மயக்கம் வந்தால் நிறுத்திவிட்டு 112 ஐ அழையுங்கள்.",
      "अगर आपको दिल की बीमारी या सीने में दर्द है, या लंबे अंतराल के बाद शुरू कर रहे हैं, तो पहले डॉक्टर से पूछें। सीने में दर्द, तेज़ साँस फूलना या बेहोशी हो तो रुकें और 112 पर कॉल करें।",
    ),
    more: L(
      "Any movement is better than none — even 10-minute walks add up. In hot weather, exercise in cooler hours and drink water.",
      "எந்த அசைவும் அசைவின்மையை விடச் சிறந்தது — 10 நிமிட நடைகளும் கூடிச் சேரும். வெயில் காலத்தில் குளிர்ந்த நேரங்களில் பயிற்சி செய்து தண்ணீர் குடியுங்கள்.",
      "कोई भी गतिविधि बिल्कुल न करने से बेहतर है — 10 मिनट की सैर भी जुड़ती जाती है। गर्मी में ठंडे समय में व्यायाम करें और पानी पिएँ।",
    ),
  },
  {
    id: "sleep-brain",
    category: "heartBrain",
    evidence: "habit",
    keywords: ["sleep", "rest", "memory", "insomnia"],
    title: L(
      "Sleep well for your brain",
      "மூளைக்காக நன்றாகத் தூங்குங்கள்",
      "दिमाग़ के लिए अच्छी नींद लें",
    ),
    summary: L(
      "During sleep the brain consolidates memory and recovers. Poor sleep is linked with high blood pressure and low mood.",
      "தூக்கத்தின் போது மூளை நினைவுகளை உறுதிப்படுத்தி மீண்டு வருகிறது. மோசமான தூக்கம் உயர் இரத்த அழுத்தம், மனச்சோர்வுடன் தொடர்புடையது.",
      "नींद के दौरान दिमाग़ यादों को मज़बूत करता है और आराम पाता है। ख़राब नींद हाई ब्लड प्रेशर और उदासी से जुड़ी है।",
    ),
    suggestion: L(
      "A regular bedtime, a dark quiet room, and a wind-down routine without screens.",
      "சீரான உறக்க நேரம், இருட்டான அமைதியான அறை, திரைகள் இல்லாத ஓய்வு நடைமுறை.",
      "सोने का नियमित समय, अँधेरा और शांत कमरा, और बिना स्क्रीन के सोने से पहले का आरामदायक रूटीन।",
    ),
    howTo: L(
      "Most adults need 7–9 hours. Avoid tea, coffee and heavy meals late in the evening.",
      "பெரும்பாலான பெரியவர்களுக்கு 7–9 மணி நேரம் தேவை. மாலை தாமதமாக டீ, காபி, கனமான உணவைத் தவிருங்கள்.",
      "ज़्यादातर वयस्कों को 7–9 घंटे चाहिए। शाम को देर से चाय, कॉफ़ी और भारी भोजन से बचें।",
    ),
    safety: L(
      "Loud snoring with pauses in breathing, or daytime sleepiness, can be sleep apnoea — see a doctor. Do not start sleeping pills without medical advice.",
      "மூச்சு நின்று நின்று வரும் உரத்த குறட்டை அல்லது பகல் நேரத் தூக்கக் கலக்கம் 'ஸ்லீப் அப்னியா' ஆக இருக்கலாம் — மருத்துவரைப் பாருங்கள். மருத்துவ ஆலோசனையின்றி தூக்க மாத்திரைகளைத் தொடங்காதீர்கள்.",
      "साँस रुक-रुककर आने वाले तेज़ खर्राटे या दिन में ज़्यादा नींद स्लीप एपनिया हो सकती है — डॉक्टर को दिखाएँ। डॉक्टर की सलाह के बिना नींद की गोलियाँ शुरू न करें।",
    ),
    more: L(
      "Daylight in the morning and activity during the day help night-time sleep. Long-lasting sleep problems, low mood or worry deserve a conversation with a doctor.",
      "காலை சூரிய ஒளியும் பகல் நேரச் செயல்பாடும் இரவுத் தூக்கத்துக்கு உதவும். நீண்டகாலத் தூக்கப் பிரச்சினை, மனச்சோர்வு அல்லது கவலை இருந்தால் மருத்துவரிடம் பேசுங்கள்.",
      "सुबह की धूप और दिन में सक्रियता रात की नींद में मदद करती है। लंबे समय तक नींद की समस्या, उदासी या चिंता हो तो डॉक्टर से बात करें।",
    ),
  },
  {
    id: "tulsi",
    category: "ayurveda",
    evidence: "traditional",
    keywords: ["tulsi", "holy basil", "thulasi", "cough", "cold"],
    title: L(
      "Tulsi (holy basil) for respiratory comfort",
      "சுவாச நலனுக்கு துளசி",
      "सांस संबंधी आराम के लिए तुलसी",
    ),
    summary: L(
      "Tulsi is traditionally used in Ayurveda and Siddha for coughs and colds. Some small studies exist, but its benefits are not firmly established.",
      "ஆயுர்வேதம், சித்த மருத்துவத்தில் இருமல், சளிக்கு துளசி பாரம்பரியமாகப் பயன்படுகிறது. சில சிறிய ஆய்வுகள் உள்ளன, ஆனால் அதன் பயன்கள் உறுதியாக நிரூபிக்கப்படவில்லை.",
      "आयुर्वेद और सिद्ध में तुलसी पारंपरिक रूप से खाँसी-ज़ुकाम में इस्तेमाल होती है। कुछ छोटे अध्ययन हैं, लेकिन इसके फ़ायदे पक्के तौर पर साबित नहीं हैं।",
    ),
    suggestion: L(
      "A few fresh tulsi leaves in warm water or tea.",
      "வெதுவெதுப்பான தண்ணீர் அல்லது டீயில் சில புதிய துளசி இலைகள்.",
      "गुनगुने पानी या चाय में तुलसी की कुछ ताज़ी पत्तियाँ।",
    ),
    howTo: L(
      "Steep 4–5 washed leaves in hot water for a few minutes and sip warm, as a comfort drink.",
      "கழுவிய 4–5 இலைகளை சூடான நீரில் சில நிமிடங்கள் ஊறவைத்து, ஆறுதல் பானமாக வெதுவெதுப்பாகக் குடியுங்கள்.",
      "4–5 धुली पत्तियाँ गरम पानी में कुछ मिनट भिगोएँ और आराम देने वाले पेय की तरह गुनगुना पिएँ।",
    ),
    safety: L(
      "Ask a doctor before regular use if you are pregnant or take blood thinners or diabetes medicines. Tulsi does not treat infections — see a doctor for high or prolonged fever or breathing difficulty.",
      "கர்ப்பமாக இருந்தால், இரத்தம் உறையாமைக்கான மருந்துகள் அல்லது நீரிழிவு மருந்துகள் எடுத்தால், தொடர்ந்து பயன்படுத்தும் முன் மருத்துவரிடம் கேளுங்கள். துளசி தொற்றுகளுக்குச் சிகிச்சை அல்ல — அதிக அல்லது நீடித்த காய்ச்சல், மூச்சுத் திணறல் இருந்தால் மருத்துவரைப் பாருங்கள்.",
      "गर्भावस्था में, या ख़ून पतला करने की या डायबिटीज़ की दवाएँ लेते हों तो नियमित उपयोग से पहले डॉक्टर से पूछें। तुलसी संक्रमण का इलाज नहीं है — तेज़ या लंबे बुख़ार या साँस लेने में तकलीफ़ हो तो डॉक्टर को दिखाएँ।",
    ),
    more: L(
      "Traditional use: Ayurveda describes tulsi as supporting the respiratory system. Scientific evidence: small studies suggest possible effects, but there are no strong trials showing it prevents or treats illness. Concentrated tulsi supplements are different from a few leaves in tea.",
      "பாரம்பரியப் பயன்பாடு: ஆயுர்வேதம் துளசியை சுவாச மண்டலத்துக்கு உதவுவதாகக் கூறுகிறது. அறிவியல் சான்று: சிறிய ஆய்வுகள் சாத்தியமான விளைவுகளைக் குறிக்கின்றன, ஆனால் நோயைத் தடுப்பதாகவோ குணப்படுத்துவதாகவோ வலுவான ஆய்வுகள் இல்லை. செறிவூட்டப்பட்ட துளசி சப்ளிமெண்ட்கள் டீயில் சில இலைகள் போடுவதிலிருந்து வேறுபட்டவை.",
      "पारंपरिक उपयोग: आयुर्वेद तुलसी को श्वसन तंत्र के लिए सहायक बताता है। वैज्ञानिक प्रमाण: छोटे अध्ययन संभावित असर दिखाते हैं, पर ऐसे मज़बूत परीक्षण नहीं हैं जो बताएँ कि यह बीमारी रोकती या ठीक करती है। तुलसी के गाढ़े सप्लीमेंट चाय में कुछ पत्तियों से अलग होते हैं।",
    ),
  },
  {
    id: "ginger",
    category: "ayurveda",
    evidence: "limited",
    keywords: ["ginger", "adrak", "inji", "nausea", "throat"],
    title: L(
      "Ginger for nausea and throat comfort",
      "குமட்டல், தொண்டை நலனுக்கு இஞ்சி",
      "मतली और गले के आराम के लिए अदरक",
    ),
    summary: L(
      "Ginger has some scientific evidence for easing mild nausea. Its use for a sore throat is traditional comfort.",
      "லேசான குமட்டலைக் குறைப்பதில் இஞ்சிக்கு ஓரளவு அறிவியல் சான்று உள்ளது. தொண்டை வலிக்கு அதன் பயன்பாடு பாரம்பரிய ஆறுதல் மட்டுமே.",
      "हल्की मतली कम करने में अदरक के कुछ वैज्ञानिक प्रमाण हैं। गले की ख़राश में इसका उपयोग पारंपरिक राहत के रूप में है।",
    ),
    suggestion: L(
      "Fresh ginger in tea, in warm water with honey (adults and children over 1 year), or in cooking.",
      "டீயில் புதிய இஞ்சி, தேனுடன் வெதுவெதுப்பான நீரில் (பெரியவர்கள், 1 வயதுக்கு மேற்பட்ட குழந்தைகள்), அல்லது சமையலில்.",
      "चाय में ताज़ा अदरक, शहद के साथ गुनगुने पानी में (वयस्क और 1 साल से बड़े बच्चे), या खाने में।",
    ),
    howTo: L(
      "Simmer a few thin slices in water for 5 minutes and sip. Small amounts as food are generally safe.",
      "சில மெல்லிய துண்டுகளை 5 நிமிடம் தண்ணீரில் கொதிக்கவைத்துக் குடியுங்கள். உணவாகச் சிறிதளவு பொதுவாகப் பாதுகாப்பானது.",
      "कुछ पतले टुकड़े पानी में 5 मिनट उबालकर घूँट-घूँट पिएँ। भोजन जितनी थोड़ी मात्रा आम तौर पर सुरक्षित है।",
    ),
    safety: L(
      "Ask a doctor before using ginger supplements if you are pregnant, take blood thinners or have gallstones. Seek care for vomiting that will not stop, signs of dehydration, or a sore throat with high fever or difficulty swallowing.",
      "கர்ப்பமாக இருந்தால், இரத்தம் உறையாமைக்கான மருந்து எடுத்தால் அல்லது பித்தப்பைக் கல் இருந்தால், இஞ்சி சப்ளிமெண்ட்களுக்கு முன் மருத்துவரிடம் கேளுங்கள். நிற்காத வாந்தி, நீர்ச்சத்துக் குறைவு அறிகுறிகள், அல்லது அதிகக் காய்ச்சலுடன் தொண்டை வலி, விழுங்குவதில் சிரமம் இருந்தால் மருத்துவ உதவி பெறுங்கள்.",
      "गर्भावस्था में, ख़ून पतला करने की दवा लेते हों या पित्ताशय की पथरी हो तो अदरक के सप्लीमेंट से पहले डॉक्टर से पूछें। न रुकने वाली उल्टी, पानी की कमी के लक्षण, या तेज़ बुख़ार के साथ गले में ख़राश या निगलने में तकलीफ़ हो तो इलाज लें।",
    ),
    more: L(
      "Evidence: trials suggest ginger can reduce mild nausea, including in pregnancy, but doses and products vary — ask your doctor before using it in pregnancy. For a sore throat, warm ginger drinks may feel soothing but do not treat bacterial infections.",
      "சான்று: கர்ப்பகாலம் உட்பட லேசான குமட்டலை இஞ்சி குறைக்கலாம் என்று ஆய்வுகள் கூறுகின்றன, ஆனால் அளவுகளும் பொருட்களும் வேறுபடும் — கர்ப்பத்தில் பயன்படுத்தும் முன் மருத்துவரிடம் கேளுங்கள். தொண்டை வலிக்கு, சூடான இஞ்சிப் பானம் இதமாக இருக்கலாம், ஆனால் பாக்டீரியா தொற்றுக்குச் சிகிச்சையாகாது.",
      "प्रमाण: परीक्षण बताते हैं कि अदरक हल्की मतली कम कर सकता है, गर्भावस्था में भी, लेकिन मात्रा और उत्पाद अलग-अलग होते हैं — गर्भावस्था में इस्तेमाल से पहले डॉक्टर से पूछें। गले की ख़राश में गरम अदरक वाला पेय आराम दे सकता है, पर बैक्टीरियल संक्रमण का इलाज नहीं है।",
    ),
  },
  {
    id: "turmeric",
    category: "ayurveda",
    evidence: "food",
    keywords: ["turmeric", "haldi", "manjal", "curcumin"],
    title: L(
      "Turmeric as an everyday spice",
      "அன்றாட மசாலாவாக மஞ்சள்",
      "रोज़ के मसाले के रूप में हल्दी",
    ),
    summary: L(
      "Turmeric adds flavour and colour to Indian cooking. Claims that it treats diseases are not well proven in people.",
      "மஞ்சள் இந்திய சமையலுக்கு சுவையும் நிறமும் சேர்க்கிறது. நோய்களுக்குச் சிகிச்சையளிக்கும் என்ற கூற்றுகள் மனிதர்களில் நன்கு நிரூபிக்கப்படவில்லை.",
      "हल्दी भारतीय खाने को स्वाद और रंग देती है। बीमारियों के इलाज के दावे इंसानों में अच्छी तरह साबित नहीं हैं।",
    ),
    suggestion: L(
      "A pinch of turmeric in dal, sambar, sabzi or warm milk.",
      "பருப்பு, சாம்பார், கறி அல்லது சூடான பாலில் ஒரு சிட்டிகை மஞ்சள்.",
      "दाल, सांभर, सब्ज़ी या गरम दूध में एक चुटकी हल्दी।",
    ),
    howTo: L(
      "Use it as a cooking spice in normal amounts. Cooking it with a little fat and black pepper is traditional.",
      "சமையல் மசாலாவாக வழக்கமான அளவில் பயன்படுத்துங்கள். சிறிது கொழுப்பு, மிளகுடன் சமைப்பது பாரம்பரிய முறை.",
      "इसे सामान्य मात्रा में खाने के मसाले की तरह इस्तेमाल करें। थोड़ी वसा और काली मिर्च के साथ पकाना पारंपरिक तरीक़ा है।",
    ),
    safety: L(
      "High-dose curcumin or turmeric supplements have been linked to rare liver injury and can interact with blood thinners and diabetes medicines. Ask a doctor before taking them, especially in pregnancy or if you have gallstones.",
      "அதிக அளவு குர்குமின் அல்லது மஞ்சள் சப்ளிமெண்ட்கள் அரிதான கல்லீரல் பாதிப்புடன் தொடர்புபடுத்தப்பட்டுள்ளன; இரத்தம் உறையாமைக்கான, நீரிழிவு மருந்துகளுடன் வினைபுரியலாம். குறிப்பாகக் கர்ப்பத்தில் அல்லது பித்தப்பைக் கல் இருந்தால், எடுக்கும் முன் மருத்துவரிடம் கேளுங்கள்.",
      "ज़्यादा मात्रा वाले करक्यूमिन या हल्दी सप्लीमेंट को दुर्लभ लिवर क्षति से जोड़ा गया है और ये ख़ून पतला करने व डायबिटीज़ की दवाओं के साथ असर कर सकते हैं। ख़ासकर गर्भावस्था में या पित्ताशय की पथरी हो तो लेने से पहले डॉक्टर से पूछें।",
    ),
    more: L(
      "Traditional use: Ayurveda uses haldi for many purposes, including on wounds and in 'haldi doodh'. Scientific evidence: curcumin shows effects in the laboratory, but it is poorly absorbed and human trials are mixed. Kitchen amounts are a food habit, not a treatment.",
      "பாரம்பரியப் பயன்பாடு: ஆயுர்வேதம் மஞ்சளைப் பல நோக்கங்களுக்குப் பயன்படுத்துகிறது — காயங்களிலும் மஞ்சள் பாலிலும். அறிவியல் சான்று: ஆய்வகத்தில் குர்குமின் விளைவுகளைக் காட்டுகிறது, ஆனால் உடலில் குறைவாகவே உறிஞ்சப்படுகிறது, மனித ஆய்வுகளின் முடிவுகள் கலவையானவை. சமையல் அளவு ஒரு உணவுப் பழக்கம், சிகிச்சை அல்ல.",
      "पारंपरिक उपयोग: आयुर्वेद हल्दी को कई कामों में इस्तेमाल करता है, घावों पर और 'हल्दी दूध' में भी। वैज्ञानिक प्रमाण: लैब में करक्यूमिन असर दिखाता है, पर शरीर में कम अवशोषित होता है और इंसानों पर परीक्षणों के नतीजे मिले-जुले हैं। रसोई वाली मात्रा खाने की आदत है, इलाज नहीं।",
    ),
  },
  {
    id: "amla",
    category: "ayurveda",
    evidence: "food",
    keywords: ["amla", "nellikai", "gooseberry", "vitamin c"],
    title: L(
      "Amla (Indian gooseberry) as a food",
      "உணவாக நெல்லிக்காய்",
      "भोजन के रूप में आँवला",
    ),
    summary: L(
      "Amla is a fruit naturally rich in vitamin C and fibre.",
      "நெல்லிக்காய் இயற்கையாகவே வைட்டமின் C, நார்ச்சத்து நிறைந்த பழம்.",
      "आँवला प्राकृतिक रूप से विटामिन C और फ़ाइबर से भरपूर फल है।",
    ),
    suggestion: L(
      "Fresh amla, amla chutney, or a little amla in salads.",
      "புதிய நெல்லிக்காய், நெல்லிக்காய் சட்னி, அல்லது சாலட்டில் சிறிது நெல்லிக்காய்.",
      "ताज़ा आँवला, आँवले की चटनी, या सलाद में थोड़ा आँवला।",
    ),
    howTo: L(
      "Eat one fresh amla or a small serving of chutney with meals. Choose low-sugar, low-salt preparations; murabba and candies are high in sugar.",
      "உணவுடன் ஒரு புதிய நெல்லிக்காய் அல்லது சிறிதளவு சட்னி சாப்பிடுங்கள். குறைந்த சர்க்கரை, குறைந்த உப்பு உள்ளவற்றைத் தேர்ந்தெடுங்கள்; முரப்பா, மிட்டாய்களில் சர்க்கரை அதிகம்.",
      "खाने के साथ एक ताज़ा आँवला या थोड़ी चटनी लें। कम चीनी, कम नमक वाली चीज़ें चुनें; मुरब्बा और कैंडी में चीनी ज़्यादा होती है।",
    ),
    safety: L(
      "Amla supplements may lower blood sugar and affect blood clotting — ask a doctor if you take diabetes medicines or blood thinners.",
      "நெல்லிக்காய் சப்ளிமெண்ட்கள் இரத்தச் சர்க்கரையைக் குறைக்கலாம், இரத்தம் உறைதலைப் பாதிக்கலாம் — நீரிழிவு மருந்துகள் அல்லது இரத்தம் உறையாமைக்கான மருந்துகள் எடுத்தால் மருத்துவரிடம் கேளுங்கள்.",
      "आँवले के सप्लीमेंट ब्लड शुगर कम कर सकते हैं और ख़ून के जमने पर असर डाल सकते हैं — डायबिटीज़ या ख़ून पतला करने की दवा लेते हों तो डॉक्टर से पूछें।",
    ),
    more: L(
      "Traditional use: amla is a key part of Ayurvedic preparations such as Chyawanprash and Triphala. Scientific evidence: it is a nutritious fruit, but claims about boosting immunity or preventing disease are not well established.",
      "பாரம்பரியப் பயன்பாடு: சியவனப்பிராசம், திரிபலா போன்ற ஆயுர்வேதத் தயாரிப்புகளில் நெல்லிக்காய் முக்கியமானது. அறிவியல் சான்று: இது சத்தான பழம், ஆனால் நோய் எதிர்ப்பை அதிகரிக்கும் அல்லது நோயைத் தடுக்கும் என்ற கூற்றுகள் நன்கு நிறுவப்படவில்லை.",
      "पारंपरिक उपयोग: च्यवनप्राश और त्रिफला जैसे आयुर्वेदिक उत्पादों में आँवला मुख्य है। वैज्ञानिक प्रमाण: यह पौष्टिक फल है, पर रोग-प्रतिरोधक क्षमता बढ़ाने या बीमारी रोकने के दावे अच्छी तरह स्थापित नहीं हैं।",
    ),
  },
  {
    id: "keezhanelli-herb",
    category: "ayurveda",
    evidence: "traditional",
    keywords: ["keezhanelli", "bhumi amla", "phyllanthus", "niruri", "jaundice"],
    title: L(
      "Keezhanelli (Phyllanthus niruri) — traditional use",
      "கீழாநெல்லி — பாரம்பரியப் பயன்பாடு",
      "भूमि आंवला (कीझानेल्ली) — पारंपरिक उपयोग",
    ),
    summary: L(
      "Keezhanelli (bhumi amla) is used in Siddha and Ayurveda, especially for jaundice and liver complaints. Scientific evidence is limited and it is not a proven treatment.",
      "கீழாநெல்லி சித்த, ஆயுர்வேத மருத்துவத்தில், குறிப்பாக மஞ்சள் காமாலை, கல்லீரல் பிரச்சினைகளுக்குப் பயன்படுகிறது. அறிவியல் சான்று குறைவு; இது நிரூபிக்கப்பட்ட சிகிச்சை அல்ல.",
      "भूमि आंवला (कीझानेल्ली) सिद्ध और आयुर्वेद में, ख़ासकर पीलिया और लिवर की शिकायतों में, इस्तेमाल होता है। वैज्ञानिक प्रमाण सीमित हैं और यह साबित इलाज नहीं है।",
    ),
    suggestion: L(
      "Learn about it as a traditional herb; do not use it in place of medical care.",
      "இதைப் பாரம்பரிய மூலிகையாக அறிந்துகொள்ளுங்கள்; மருத்துவச் சிகிச்சைக்குப் பதிலாகப் பயன்படுத்தாதீர்கள்.",
      "इसे एक पारंपरिक जड़ी-बूटी के रूप में जानें; डॉक्टरी इलाज की जगह इस्तेमाल न करें।",
    ),
    howTo: L(
      "If you want to try it, talk to your doctor and a qualified AYUSH practitioner first, and use a product from a reliable source.",
      "முயற்சிக்க விரும்பினால், முதலில் உங்கள் மருத்துவரிடமும் தகுதியான ஆயுஷ் மருத்துவரிடமும் பேசுங்கள்; நம்பகமான மூலத்திலிருந்து வாங்கிய பொருளைப் பயன்படுத்துங்கள்.",
      "आज़माना चाहें तो पहले अपने डॉक्टर और योग्य आयुष चिकित्सक से बात करें, और भरोसेमंद स्रोत का उत्पाद इस्तेमाल करें।",
    ),
    safety: L(
      "Avoid it in pregnancy and breastfeeding. It may lower blood sugar and blood pressure and increase urine output, so it can interact with diabetes, blood-pressure and diuretic medicines. Jaundice always needs a medical check-up.",
      "கர்ப்பம், தாய்ப்பாலூட்டும் காலத்தில் தவிர்க்கவும். இது இரத்தச் சர்க்கரை, இரத்த அழுத்தத்தைக் குறைத்து சிறுநீர் அளவை அதிகரிக்கலாம்; எனவே நீரிழிவு, இரத்த அழுத்த, சிறுநீர்ப் பெருக்கி மருந்துகளுடன் வினைபுரியலாம். மஞ்சள் காமாலைக்கு எப்போதும் மருத்துவப் பரிசோதனை தேவை.",
      "गर्भावस्था और स्तनपान में न लें। यह ब्लड शुगर और ब्लड प्रेशर कम कर सकता है और पेशाब बढ़ा सकता है, इसलिए डायबिटीज़, ब्लड प्रेशर और मूत्रवर्धक दवाओं के साथ असर कर सकता है। पीलिया में हमेशा डॉक्टरी जाँच ज़रूरी है।",
    ),
    more: L(
      "Traditional use: Siddha and Ayurveda use keezhanelli for jaundice, digestion and urinary complaints. Scientific evidence: some laboratory and small human studies (for example in hepatitis B and kidney stones) exist, but results are inconsistent and not strong enough to recommend it as a treatment.",
      "பாரம்பரியப் பயன்பாடு: சித்த, ஆயுர்வேத மருத்துவங்கள் மஞ்சள் காமாலை, செரிமானம், சிறுநீர்ப் பிரச்சினைகளுக்கு கீழாநெல்லியைப் பயன்படுத்துகின்றன. அறிவியல் சான்று: சில ஆய்வக, சிறிய மனித ஆய்வுகள் (உதா: ஹெபடைடிஸ் B, சிறுநீரகக் கல்) உள்ளன, ஆனால் முடிவுகள் ஒத்துப்போகவில்லை; சிகிச்சையாகப் பரிந்துரைக்கும் அளவுக்கு வலுவாக இல்லை.",
      "पारंपरिक उपयोग: सिद्ध और आयुर्वेद पीलिया, पाचन और पेशाब की शिकायतों में भूमि आंवला इस्तेमाल करते हैं। वैज्ञानिक प्रमाण: कुछ लैब और छोटे मानव अध्ययन (जैसे हेपेटाइटिस B और किडनी स्टोन में) हैं, पर नतीजे एक जैसे नहीं हैं और इलाज के रूप में सुझाने लायक मज़बूत नहीं हैं।",
    ),
  },
  {
    id: "warm-fluids",
    category: "coldFever",
    evidence: "food",
    keywords: ["soup", "rasam", "tea", "sore throat", "gargle"],
    title: L(
      "Warm fluids for a cold",
      "சளிக்கு வெதுவெதுப்பான பானங்கள்",
      "ज़ुकाम में गुनगुने पेय",
    ),
    summary: L(
      "Warm drinks can soothe a sore throat, loosen mucus and help you stay hydrated.",
      "வெதுவெதுப்பான பானங்கள் தொண்டை வலியை இதமாக்கி, சளியைத் தளர்த்தி, நீர்ச்சத்து குறையாமல் இருக்க உதவும்.",
      "गुनगुने पेय गले की ख़राश को आराम देते हैं, बलगम ढीला करते हैं और शरीर में पानी बनाए रखने में मदद करते हैं।",
    ),
    suggestion: L(
      "Warm water, rasam, soups, dal water, herbal or ginger tea.",
      "வெதுவெதுப்பான தண்ணீர், ரசம், சூப், பருப்புத் தண்ணீர், மூலிகை அல்லது இஞ்சி டீ.",
      "गुनगुना पानी, रसम, सूप, दाल का पानी, हर्बल या अदरक की चाय।",
    ),
    howTo: L(
      "Sip warm (not hot) drinks through the day. Gargling with warm salt water may ease a sore throat in adults and older children.",
      "நாள் முழுவதும் வெதுவெதுப்பான (சூடான அல்ல) பானங்களைக் குடியுங்கள். பெரியவர்களுக்கும் பெரிய குழந்தைகளுக்கும் வெதுவெதுப்பான உப்புநீர் கொப்பளிப்பு தொண்டை வலியைக் குறைக்கலாம்.",
      "दिन भर गुनगुने (गरम नहीं) पेय पिएँ। वयस्कों और बड़े बच्चों में गुनगुने नमक-पानी के गरारे गले की ख़राश में आराम दे सकते हैं।",
    ),
    safety: L(
      "Test the temperature to avoid burns, especially for children. Get medical care for fever lasting more than 3 days, breathing difficulty, or a child who is unusually drowsy or not drinking.",
      "குறிப்பாகக் குழந்தைகளுக்கு, சுடாமல் இருக்க வெப்பநிலையைச் சரிபாருங்கள். 3 நாட்களுக்கு மேல் காய்ச்சல், மூச்சுத் திணறல், அல்லது வழக்கத்துக்கு மாறாகத் தூக்கக் கலக்கமாக அல்லது குடிக்காமல் இருக்கும் குழந்தைக்கு மருத்துவ உதவி பெறுங்கள்.",
      "जलने से बचने के लिए, ख़ासकर बच्चों के लिए, तापमान जाँच लें। 3 दिन से ज़्यादा बुख़ार, साँस लेने में तकलीफ़, या बच्चा असामान्य रूप से सुस्त हो या पी न रहा हो तो डॉक्टर को दिखाएँ।",
    ),
    more: L(
      "Most colds are viral and get better within 7–10 days. Antibiotics do not help viral colds. Warm fluids ease symptoms; they do not shorten the illness.",
      "பெரும்பாலான சளிகள் வைரஸால் வருபவை, 7–10 நாட்களில் சரியாகும். வைரஸ் சளிக்கு ஆன்டிபயாடிக்குகள் உதவாது. வெதுவெதுப்பான பானங்கள் அறிகுறிகளைக் குறைக்கும்; நோயின் கால அளவைக் குறைக்காது.",
      "ज़्यादातर ज़ुकाम वायरस से होते हैं और 7–10 दिन में ठीक हो जाते हैं। वायरल ज़ुकाम में एंटीबायोटिक मदद नहीं करते। गुनगुने पेय लक्षणों में आराम देते हैं; बीमारी की अवधि कम नहीं करते।",
    ),
  },
  {
    id: "rest-hydration-fever",
    category: "coldFever",
    evidence: "habit",
    keywords: ["fever", "ors", "rest", "paracetamol", "kanji"],
    title: L(
      "Rest and fluids during fever",
      "காய்ச்சலின் போது ஓய்வும் நீர்ச்சத்தும்",
      "बुख़ार में आराम और तरल",
    ),
    summary: L(
      "Fever increases fluid loss. Rest and regular fluids help the body recover.",
      "காய்ச்சல் நீரிழப்பை அதிகரிக்கும். ஓய்வும் சீரான நீர்ப் பருகலும் உடல் மீள உதவும்.",
      "बुख़ार में शरीर से पानी ज़्यादा निकलता है। आराम और नियमित तरल शरीर को ठीक होने में मदद करते हैं।",
    ),
    suggestion: L(
      "Water, ORS, coconut water, kanji (rice gruel), buttermilk, soups.",
      "தண்ணீர், ORS, இளநீர், கஞ்சி, மோர், சூப்.",
      "पानी, ORS, नारियल पानी, चावल की कांजी, छाछ, सूप।",
    ),
    howTo: L(
      "Drink small amounts often. Use ORS if there is vomiting or diarrhoea. Wear light clothing, and use paracetamol only as advised on the label or by a doctor.",
      "சிறிது சிறிதாக அடிக்கடி குடியுங்கள். வாந்தி அல்லது வயிற்றுப்போக்கு இருந்தால் ORS பயன்படுத்துங்கள். லேசான ஆடை அணியுங்கள்; பாராசிட்டமாலை லேபிளில் அல்லது மருத்துவர் சொன்னபடி மட்டும் பயன்படுத்துங்கள்.",
      "थोड़ा-थोड़ा, बार-बार पिएँ। उल्टी या दस्त हों तो ORS लें। हल्के कपड़े पहनें, और पैरासिटामोल केवल लेबल या डॉक्टर के बताए अनुसार लें।",
    ),
    safety: L(
      "Urgent care is needed for fever with severe headache or stiff neck, rash, bleeding, breathing difficulty, confusion, fits, very little urine, or any fever in a baby under 3 months. Call 112 in an emergency.",
      "அவசர மருத்துவ உதவி தேவை: கடும் தலைவலி அல்லது கழுத்து விறைப்புடன் காய்ச்சல், தடிப்பு, இரத்தப்போக்கு, மூச்சுத் திணறல், குழப்பம், வலிப்பு, மிகக் குறைந்த சிறுநீர், அல்லது 3 மாதத்துக்குக் குறைவான குழந்தைக்கு எந்தக் காய்ச்சலும். அவசர நிலையில் 112 ஐ அழையுங்கள்.",
      "इनमें तुरंत इलाज ज़रूरी है: तेज़ सिरदर्द या गर्दन में अकड़न के साथ बुख़ार, दाने, ख़ून बहना, साँस लेने में तकलीफ़, भ्रम, दौरे, बहुत कम पेशाब, या 3 महीने से छोटे शिशु को कोई भी बुख़ार। आपात स्थिति में 112 पर कॉल करें।",
    ),
    more: L(
      "Fever is a sign that the body is fighting an infection. In India, fever can also be dengue, malaria or typhoid, so a fever lasting more than 2–3 days should be checked by a doctor. Do not give aspirin to children.",
      "காய்ச்சல், உடல் தொற்றுடன் போராடுவதற்கான அறிகுறி. இந்தியாவில் காய்ச்சல் டெங்கு, மலேரியா அல்லது டைபாய்டாகவும் இருக்கலாம், எனவே 2–3 நாட்களுக்கு மேல் நீடிக்கும் காய்ச்சலை மருத்துவர் பரிசோதிக்க வேண்டும். குழந்தைகளுக்கு ஆஸ்பிரின் கொடுக்காதீர்கள்.",
      "बुख़ार इस बात का संकेत है कि शरीर संक्रमण से लड़ रहा है। भारत में बुख़ार डेंगू, मलेरिया या टाइफ़ाइड भी हो सकता है, इसलिए 2–3 दिन से ज़्यादा चलने वाला बुख़ार डॉक्टर को दिखाएँ। बच्चों को एस्पिरिन न दें।",
    ),
  },
  {
    id: "honey-cough",
    category: "coldFever",
    evidence: "food",
    keywords: ["honey", "shahad", "then", "cough", "children"],
    title: L(
      "Honey for cough (over 1 year of age)",
      "இருமலுக்குத் தேன் (1 வயதுக்கு மேல்)",
      "खाँसी में शहद (1 साल से ज़्यादा उम्र)",
    ),
    summary: L(
      "Honey can ease cough and help sleep in adults and children over one year old.",
      "பெரியவர்களுக்கும் ஒரு வயதுக்கு மேற்பட்ட குழந்தைகளுக்கும் தேன் இருமலைக் குறைத்துத் தூக்கத்துக்கு உதவலாம்.",
      "शहद वयस्कों और एक साल से बड़े बच्चों में खाँसी कम करने और नींद में मदद कर सकता है।",
    ),
    suggestion: L(
      "Plain honey, alone or in warm water or tea.",
      "வெறும் தேன், தனியாகவோ வெதுவெதுப்பான நீர் அல்லது டீயிலோ.",
      "सादा शहद, अकेले या गुनगुने पानी या चाय में।",
    ),
    howTo: L(
      "At bedtime: children 1–5 years ½ teaspoon; 6–11 years 1 teaspoon; 12 years and adults 2 teaspoons.",
      "உறங்கும் முன்: 1–5 வயதுக் குழந்தைகள் ½ தேக்கரண்டி; 6–11 வயது 1 தேக்கரண்டி; 12 வயதும் பெரியவர்களும் 2 தேக்கரண்டி.",
      "सोने से पहले: 1–5 साल के बच्चे ½ छोटा चम्मच; 6–11 साल 1 छोटा चम्मच; 12 साल और वयस्क 2 छोटे चम्मच।",
    ),
    safety: L(
      "Never give honey to babies under 12 months — it can cause infant botulism, a serious illness. People with diabetes should count honey as sugar. See a doctor for a cough lasting over 3 weeks, cough with blood, or breathing difficulty.",
      "12 மாதத்துக்குக் குறைவான குழந்தைகளுக்கு ஒருபோதும் தேன் கொடுக்காதீர்கள் — அது 'இன்ஃபன்ட் பொட்டுலிசம்' என்ற தீவிர நோயை ஏற்படுத்தலாம். நீரிழிவு உள்ளவர்கள் தேனைச் சர்க்கரையாகக் கணக்கிட வேண்டும். 3 வாரங்களுக்கு மேல் இருமல், இரத்தத்துடன் இருமல், அல்லது மூச்சுத் திணறல் இருந்தால் மருத்துவரைப் பாருங்கள்.",
      "12 महीने से छोटे शिशुओं को कभी शहद न दें — इससे शिशु बोटुलिज़्म नाम की गंभीर बीमारी हो सकती है। मधुमेह वाले लोग शहद को चीनी की तरह गिनें। 3 हफ़्ते से ज़्यादा खाँसी, खाँसी में ख़ून, या साँस लेने में तकलीफ़ हो तो डॉक्टर को दिखाएँ।",
    ),
    more: L(
      "Studies show honey may reduce how often and how badly children cough at night, about as well as some cough syrups. It soothes symptoms; it does not treat the infection causing the cough.",
      "இரவில் குழந்தைகள் இருமும் அளவையும் தீவிரத்தையும் தேன் குறைக்கலாம் என்றும், சில இருமல் மருந்துகள் அளவுக்குப் பயன்தரலாம் என்றும் ஆய்வுகள் காட்டுகின்றன. இது அறிகுறிகளை இதமாக்கும்; இருமலுக்குக் காரணமான தொற்றுக்குச் சிகிச்சையாகாது.",
      "अध्ययन बताते हैं कि शहद रात में बच्चों की खाँसी कितनी बार और कितनी तेज़ होती है, इसे कुछ कफ़ सिरप जितना कम कर सकता है। यह लक्षणों में आराम देता है; खाँसी के कारण वाले संक्रमण का इलाज नहीं करता।",
    ),
  },
  {
    id: "saline-nasal",
    category: "coldFever",
    evidence: "limited",
    keywords: ["saline", "nasal spray", "nose drops", "blocked nose"],
    title: L(
      "Saline nose drops or spray",
      "உப்புநீர் மூக்குச் சொட்டு அல்லது ஸ்ப்ரே",
      "सेलाइन (नमकीन पानी) की नाक की बूँदें या स्प्रे",
    ),
    summary: L(
      "Salt-water (saline) drops or spray can loosen mucus and ease a blocked nose. They contain no medicine.",
      "உப்புநீர் (சலைன்) சொட்டுகள் அல்லது ஸ்ப்ரே சளியைத் தளர்த்தி மூக்கடைப்பைக் குறைக்கலாம். அவற்றில் மருந்து இல்லை.",
      "नमकीन पानी (सेलाइन) की बूँदें या स्प्रे बलगम ढीला कर बंद नाक में आराम दे सकते हैं। इनमें कोई दवा नहीं होती।",
    ),
    suggestion: L(
      "Ready-made sterile saline drops or spray from a pharmacy.",
      "மருந்தகத்தில் கிடைக்கும் தயாரான, கிருமிநீக்கம் செய்யப்பட்ட சலைன் சொட்டுகள் அல்லது ஸ்ப்ரே.",
      "फ़ार्मेसी से मिलने वाली तैयार, जीवाणुरहित सेलाइन बूँदें या स्प्रे।",
    ),
    howTo: L(
      "Use a few drops or sprays in each nostril several times a day. For babies, use saline drops and gently clear the nose before feeds.",
      "ஒவ்வொரு நாசியிலும் சில சொட்டுகள் அல்லது ஸ்ப்ரேக்களை நாளுக்குப் பலமுறை பயன்படுத்துங்கள். கைக்குழந்தைகளுக்கு, பாலூட்டும் முன் சலைன் சொட்டுகள் விட்டு மெதுவாக மூக்கைச் சுத்தம் செய்யுங்கள்.",
      "हर नथुने में कुछ बूँदें या स्प्रे दिन में कई बार डालें। शिशुओं के लिए सेलाइन बूँदें डालें और दूध पिलाने से पहले धीरे से नाक साफ़ करें।",
    ),
    safety: L(
      "If you make salt water at home for rinsing, use only boiled-and-cooled or sterile water — never plain tap water. Keep each bottle for one person.",
      "வீட்டில் கழுவுவதற்கு உப்புநீர் தயாரித்தால், கொதிக்கவைத்து ஆறவைத்த அல்லது கிருமிநீக்கம் செய்த நீரை மட்டும் பயன்படுத்துங்கள் — சாதாரணக் குழாய் நீரை ஒருபோதும் பயன்படுத்தாதீர்கள். ஒவ்வொரு பாட்டிலையும் ஒருவர் மட்டுமே பயன்படுத்த வேண்டும்.",
      "घर पर नाक धोने के लिए नमक-पानी बनाएँ तो केवल उबालकर ठंडा किया या जीवाणुरहित पानी इस्तेमाल करें — कभी सीधा नल का पानी नहीं। हर बोतल एक ही व्यक्ति इस्तेमाल करे।",
    ),
    more: L(
      "Saline is safe for most people, including children and pregnant women, and research suggests it can ease nasal symptoms, though the benefit is modest. Medicated decongestant sprays are different and should not be used for more than a few days without advice.",
      "சலைன் குழந்தைகள், கர்ப்பிணிகள் உட்பட பெரும்பாலானோருக்குப் பாதுகாப்பானது; மூக்கு அறிகுறிகளைக் குறைக்கலாம் என ஆய்வுகள் கூறுகின்றன, ஆனால் பயன் மிதமானது. மருந்து கலந்த மூக்கடைப்பு நீக்கி ஸ்ப்ரேக்கள் வேறுபட்டவை; ஆலோசனையின்றி சில நாட்களுக்கு மேல் பயன்படுத்தக்கூடாது.",
      "सेलाइन ज़्यादातर लोगों के लिए सुरक्षित है, बच्चों और गर्भवती महिलाओं समेत, और शोध बताते हैं कि यह नाक के लक्षणों में आराम दे सकता है, हालाँकि फ़ायदा मामूली है। दवा वाले डीकंजेस्टेंट स्प्रे अलग हैं और सलाह के बिना कुछ दिनों से ज़्यादा इस्तेमाल नहीं करने चाहिए।",
    ),
  },
  {
    id: "papaya-leaf-dengue",
    category: "coldFever",
    evidence: "limited",
    keywords: ["papaya leaf", "dengue", "platelets", "fever"],
    title: L(
      "Papaya leaf and dengue: what we know",
      "பப்பாளி இலையும் டெங்குவும்: நமக்குத் தெரிந்தவை",
      "पपीते के पत्ते और डेंगू: हम क्या जानते हैं",
    ),
    summary: L(
      "Papaya leaf juice or tablets are widely used for dengue in India, but the evidence is not enough to recommend self-treatment. Dengue needs medical assessment.",
      "இந்தியாவில் டெங்குவுக்கு பப்பாளி இலைச் சாறு அல்லது மாத்திரைகள் பரவலாகப் பயன்படுகின்றன, ஆனால் சுயசிகிச்சையைப் பரிந்துரைக்கச் சான்றுகள் போதாது. டெங்குவுக்கு மருத்துவப் பரிசோதனை அவசியம்.",
      "भारत में डेंगू के लिए पपीते के पत्ते का रस या गोलियाँ ख़ूब इस्तेमाल होती हैं, लेकिन ख़ुद इलाज की सलाह देने के लिए प्रमाण काफ़ी नहीं हैं। डेंगू में डॉक्टरी जाँच ज़रूरी है।",
    ),
    suggestion: L(
      "If dengue is suspected, see a doctor for a blood test and follow-up, and drink plenty of fluids.",
      "டெங்கு சந்தேகம் இருந்தால், இரத்தப் பரிசோதனைக்கும் தொடர் கண்காணிப்புக்கும் மருத்துவரைப் பாருங்கள்; நிறைய திரவங்கள் குடியுங்கள்.",
      "डेंगू का शक हो तो ख़ून की जाँच और आगे की निगरानी के लिए डॉक्टर को दिखाएँ, और ख़ूब तरल पिएँ।",
    ),
    howTo: L(
      "Do not rely on papaya leaf instead of medical care; if you want to take it, tell your doctor. For fever, use paracetamol as advised, and avoid aspirin and ibuprofen unless a doctor says otherwise.",
      "மருத்துவச் சிகிச்சைக்குப் பதிலாக பப்பாளி இலையை நம்பாதீர்கள்; எடுக்க விரும்பினால், மருத்துவரிடம் சொல்லுங்கள். காய்ச்சலுக்கு அறிவுறுத்தியபடி பாராசிட்டமால் பயன்படுத்துங்கள்; மருத்துவர் சொன்னால் ஒழிய ஆஸ்பிரின், ஐபுப்ரோஃபென் தவிருங்கள்.",
      "डॉक्टरी इलाज की जगह पपीते के पत्ते पर भरोसा न करें; लेना चाहें तो डॉक्टर को बताएँ। बुख़ार में बताए अनुसार पैरासिटामोल लें, और डॉक्टर न कहें तो एस्पिरिन और आइबुप्रोफ़ेन से बचें।",
    ),
    safety: L(
      "Go to a hospital urgently for severe stomach pain, repeated vomiting, bleeding from the gums or nose, black stools, extreme tiredness or restlessness, cold clammy skin, or difficulty breathing — especially as the fever comes down. Call 112 in an emergency.",
      "உடனடியாக மருத்துவமனைக்குச் செல்லுங்கள்: கடும் வயிற்று வலி, தொடர் வாந்தி, ஈறு அல்லது மூக்கிலிருந்து இரத்தம், கருப்பு மலம், கடும் சோர்வு அல்லது அமைதியின்மை, குளிர்ந்த ஈரமான தோல், மூச்சுத் திணறல் — குறிப்பாகக் காய்ச்சல் குறையும் நேரத்தில். அவசர நிலையில் 112 ஐ அழையுங்கள்.",
      "तुरंत अस्पताल जाएँ अगर पेट में तेज़ दर्द, बार-बार उल्टी, मसूड़ों या नाक से ख़ून, काला मल, बहुत ज़्यादा थकान या बेचैनी, ठंडी चिपचिपी त्वचा, या साँस लेने में तकलीफ़ हो — ख़ासकर जब बुख़ार उतर रहा हो। आपात स्थिति में 112 पर कॉल करें।",
    ),
    more: L(
      "Some small studies reported faster rises in platelet counts with papaya leaf extract, but they were small and of limited quality, and did not show fewer complications or deaths. Platelet counts often rise on their own as dengue resolves. Monitoring by a doctor is what keeps people safe.",
      "பப்பாளி இலைச் சாற்றால் தட்டணுக்கள் வேகமாக உயர்ந்ததாகச் சில சிறிய ஆய்வுகள் கூறின, ஆனால் அவை சிறியவை, தரம் குறைந்தவை; சிக்கல்களோ இறப்புகளோ குறைந்ததாகக் காட்டவில்லை. டெங்கு சரியாகும்போது தட்டணுக்கள் பெரும்பாலும் தாமாகவே உயரும். மருத்துவரின் கண்காணிப்பே மக்களைப் பாதுகாப்பாக வைத்திருக்கிறது.",
      "कुछ छोटे अध्ययनों में पपीते के पत्ते के अर्क से प्लेटलेट तेज़ी से बढ़ने की बात कही गई, पर वे छोटे और सीमित गुणवत्ता के थे, और उनमें जटिलताएँ या मौतें कम होना नहीं दिखा। डेंगू ठीक होने के साथ प्लेटलेट अक्सर अपने आप बढ़ जाते हैं। डॉक्टर की निगरानी ही लोगों को सुरक्षित रखती है।",
    ),
  },
  {
    id: "prunes",
    category: "digestion",
    evidence: "food",
    keywords: ["prunes", "constipation", "dried plum", "figs"],
    title: L(
      "Prunes for constipation",
      "மலச்சிக்கலுக்கு ப்ரூன்ஸ் (உலர்ந்த பிளம்)",
      "कब्ज़ में प्रून्स (सूखा आलूबुख़ारा)",
    ),
    summary: L(
      "Prunes contain fibre and sorbitol, which draw water into the bowel. Trials show they can help mild constipation.",
      "ப்ரூன்ஸில் நார்ச்சத்தும் சார்பிட்டாலும் உள்ளன; அவை குடலுக்குள் நீரை இழுக்கின்றன. லேசான மலச்சிக்கலுக்கு உதவலாம் என ஆய்வுகள் காட்டுகின்றன.",
      "प्रून्स में फ़ाइबर और सॉर्बिटॉल होता है, जो आँतों में पानी खींचते हैं। परीक्षण बताते हैं कि ये हल्की कब्ज़ में मदद कर सकते हैं।",
    ),
    suggestion: L(
      "Prunes, or other fruits such as papaya, guava, pear, or soaked figs and raisins.",
      "ப்ரூன்ஸ், அல்லது பப்பாளி, கொய்யா, பேரிக்காய், ஊறவைத்த அத்திப்பழம், உலர் திராட்சை போன்ற பிற பழங்கள்.",
      "प्रून्स, या पपीता, अमरूद, नाशपाती, भीगे अंजीर और किशमिश जैसे दूसरे फल।",
    ),
    howTo: L(
      "Start with 3–4 prunes a day with water and increase slowly if needed.",
      "நாளொன்றுக்கு 3–4 ப்ரூன்ஸ் தண்ணீருடன் தொடங்கி, தேவைப்பட்டால் மெதுவாக அதிகரியுங்கள்.",
      "रोज़ पानी के साथ 3–4 प्रून्स से शुरू करें और ज़रूरत हो तो धीरे-धीरे बढ़ाएँ।",
    ),
    safety: L(
      "Too many can cause gas or loose stools. Prunes are high in potassium and sugar — ask your doctor if you have kidney disease or diabetes.",
      "அதிகமாகச் சாப்பிட்டால் வாயு அல்லது இளகிய மலம் வரலாம். ப்ரூன்ஸில் பொட்டாசியமும் சர்க்கரையும் அதிகம் — சிறுநீரக நோய் அல்லது நீரிழிவு இருந்தால் மருத்துவரிடம் கேளுங்கள்.",
      "ज़्यादा खाने से गैस या पतला मल हो सकता है। प्रून्स में पोटैशियम और शक्कर ज़्यादा होती है — किडनी रोग या मधुमेह हो तो डॉक्टर से पूछें।",
    ),
    more: L(
      "See a doctor if constipation is new and lasts more than 2–3 weeks, or comes with blood in the stool, weight loss, severe pain or vomiting.",
      "மலச்சிக்கல் புதிதாக வந்து 2–3 வாரங்களுக்கு மேல் நீடித்தால், அல்லது மலத்தில் இரத்தம், எடை இழப்பு, கடும் வலி, வாந்தியுடன் வந்தால் மருத்துவரைப் பாருங்கள்.",
      "अगर कब्ज़ नई हो और 2–3 हफ़्ते से ज़्यादा रहे, या मल में ख़ून, वज़न घटना, तेज़ दर्द या उल्टी के साथ हो, तो डॉक्टर को दिखाएँ।",
    ),
  },
  {
    id: "fibre-foods",
    category: "digestion",
    evidence: "food",
    keywords: ["fiber", "fibre", "isabgol", "psyllium", "constipation"],
    title: L(
      "Add fibre-rich foods",
      "நார்ச்சத்து நிறைந்த உணவுகளைச் சேர்த்துக்கொள்ளுங்கள்",
      "फ़ाइबर से भरपूर भोजन शामिल करें",
    ),
    summary: L(
      "Fibre adds bulk and softness to stools and supports healthy gut bacteria.",
      "நார்ச்சத்து மலத்துக்கு அளவையும் மென்மையையும் தந்து, குடலின் நல்ல பாக்டீரியாக்களுக்கு உதவுகிறது.",
      "फ़ाइबर मल को भारी और नरम बनाता है और आँत के अच्छे बैक्टीरिया को सहारा देता है।",
    ),
    suggestion: L(
      "Whole grains, millets, dal, rajma, vegetables, fruits with their skin, isabgol (psyllium) husk.",
      "முழு தானியங்கள், சிறுதானியங்கள், பருப்பு, ராஜ்மா, காய்கறிகள், தோலுடன் பழங்கள், இசப்கோல் (சைலியம்) உமி.",
      "साबुत अनाज, मोटे अनाज, दाल, राजमा, सब्ज़ियाँ, छिलके सहित फल, इसबगोल की भूसी।",
    ),
    howTo: L(
      "Increase fibre gradually over 1–2 weeks and drink more water with it. Take isabgol with a full glass of water.",
      "1–2 வாரங்களில் படிப்படியாக நார்ச்சத்தை அதிகரித்து, அதனுடன் கூடுதல் தண்ணீர் குடியுங்கள். இசப்கோலை முழு டம்ளர் தண்ணீருடன் எடுங்கள்.",
      "1–2 हफ़्तों में धीरे-धीरे फ़ाइबर बढ़ाएँ और साथ में ज़्यादा पानी पिएँ। इसबगोल पूरे गिलास पानी के साथ लें।",
    ),
    safety: L(
      "Take isabgol at least 2 hours apart from other medicines, as it can reduce their absorption. People with swallowing problems or narrowing of the bowel should ask a doctor first.",
      "இசப்கோல் பிற மருந்துகள் உறிஞ்சப்படுவதைக் குறைக்கலாம், எனவே குறைந்தது 2 மணி நேர இடைவெளி விடுங்கள். விழுங்குவதில் சிரமம் அல்லது குடல் சுருக்கம் உள்ளவர்கள் முதலில் மருத்துவரிடம் கேளுங்கள்.",
      "इसबगोल दूसरी दवाओं का अवशोषण कम कर सकता है, इसलिए कम से कम 2 घंटे का अंतर रखें। निगलने में दिक़्क़त या आँत में सिकुड़न वाले लोग पहले डॉक्टर से पूछें।",
    ),
    more: L(
      "Most adults benefit from about 25–30 g of fibre a day, but many eat much less. A sudden large increase can cause bloating, which usually settles as the gut adjusts.",
      "பெரும்பாலான பெரியவர்களுக்கு நாளொன்றுக்கு சுமார் 25–30 கிராம் நார்ச்சத்து பயன்தரும், ஆனால் பலர் அதைவிட மிகக் குறைவாகவே சாப்பிடுகிறார்கள். திடீரென அதிகம் சேர்த்தால் வயிறு உப்புசம் வரலாம்; குடல் பழகியதும் பொதுவாகச் சரியாகும்.",
      "ज़्यादातर वयस्कों को रोज़ लगभग 25–30 ग्राम फ़ाइबर से फ़ायदा होता है, पर कई लोग इससे बहुत कम खाते हैं। अचानक ज़्यादा बढ़ाने से पेट फूल सकता है, जो आमतौर पर आँत के आदी होने पर ठीक हो जाता है।",
    ),
  },
  {
    id: "fluids-digestion",
    category: "digestion",
    evidence: "food",
    keywords: ["water", "fluids", "constipation", "hard stools"],
    title: L(
      "Enough fluids for regular bowels",
      "சீரான மலம் கழிக்கப் போதுமான திரவங்கள்",
      "नियमित मल त्याग के लिए पर्याप्त तरल",
    ),
    summary: L(
      "Fibre needs water to work. Low fluid intake can make stools hard.",
      "நார்ச்சத்து செயல்படத் தண்ணீர் தேவை. குறைவான நீர் அருந்துதல் மலத்தைக் கடினமாக்கும்.",
      "फ़ाइबर को काम करने के लिए पानी चाहिए। कम तरल लेने से मल सख़्त हो सकता है।",
    ),
    suggestion: L(
      "Water, buttermilk, soups, dal water, and fruits with a lot of water such as watermelon.",
      "தண்ணீர், மோர், சூப், பருப்புத் தண்ணீர், தர்பூசணி போன்ற நீர்ச்சத்து அதிகமுள்ள பழங்கள்.",
      "पानी, छाछ, सूप, दाल का पानी, और तरबूज़ जैसे पानी वाले फल।",
    ),
    howTo: L(
      "Drink regularly through the day, a little more in hot weather. A glass of water in the morning may help some people.",
      "நாள் முழுவதும் சீராகக் குடியுங்கள், வெயிலில் சற்றுக் கூடுதலாக. காலையில் ஒரு டம்ளர் தண்ணீர் சிலருக்கு உதவலாம்.",
      "दिन भर नियमित रूप से पिएँ, गर्मी में थोड़ा ज़्यादा। सुबह एक गिलास पानी कुछ लोगों को मदद कर सकता है।",
    ),
    safety: L(
      "People with kidney disease, heart failure or a prescribed fluid restriction should follow their clinician's advice on how much to drink.",
      "சிறுநீரக நோய், இதயச் செயலிழப்பு அல்லது பரிந்துரைக்கப்பட்ட திரவக் கட்டுப்பாடு உள்ளவர்கள், எவ்வளவு குடிக்க வேண்டும் என்பதில் மருத்துவரின் ஆலோசனையைப் பின்பற்ற வேண்டும்.",
      "किडनी रोग, हार्ट फ़ेलियर या तय की गई तरल-सीमा वाले लोग कितना पीना है इस पर अपने डॉक्टर की सलाह मानें।",
    ),
    more: L(
      "Extra water helps most when you are low on fluids; drinking far more than you need does not soften stools further. Tea and coffee also count towards fluids in moderation.",
      "உடலில் நீர் குறைவாக இருக்கும்போதுதான் கூடுதல் தண்ணீர் அதிகம் உதவும்; தேவைக்கு மிக அதிகமாகக் குடிப்பது மலத்தை மேலும் இளக்காது. டீ, காபியும் மிதமான அளவில் திரவக் கணக்கில் சேரும்.",
      "ज़्यादा पानी तब सबसे ज़्यादा मदद करता है जब शरीर में तरल कम हो; ज़रूरत से बहुत ज़्यादा पीने से मल और नरम नहीं होता। चाय और कॉफ़ी भी सीमित मात्रा में तरल में गिनी जाती हैं।",
    ),
  },
  {
    id: "gentle-activity",
    category: "digestion",
    evidence: "habit",
    keywords: ["walking", "exercise", "bloating", "constipation"],
    title: L(
      "Gentle activity after meals",
      "உணவுக்குப் பின் மென்மையான செயல்பாடு",
      "खाने के बाद हल्की गतिविधि",
    ),
    summary: L(
      "Moving your body helps the bowel move too. Regular walking can ease constipation and bloating.",
      "உடல் அசைந்தால் குடலும் இயங்கும். தொடர்ந்த நடைப்பயிற்சி மலச்சிக்கலையும் வயிற்று உப்புசத்தையும் குறைக்கலாம்.",
      "शरीर हिलाने से आँतें भी चलती हैं। नियमित सैर कब्ज़ और पेट फूलने में आराम दे सकती है।",
    ),
    suggestion: L(
      "A 10–15 minute walk after meals, light yoga, or household activity.",
      "உணவுக்குப் பின் 10–15 நிமிட நடை, லேசான யோகா, அல்லது வீட்டு வேலைகள்.",
      "खाने के बाद 10–15 मिनट की सैर, हल्का योग, या घर के काम।",
    ),
    howTo: L(
      "Try to be active most days, and respond to the urge to pass stools rather than delaying it.",
      "பெரும்பாலான நாட்களில் சுறுசுறுப்பாக இருங்கள்; மலம் கழிக்கும் உணர்வு வந்தால் தள்ளிப்போடாதீர்கள்.",
      "ज़्यादातर दिनों में सक्रिय रहें, और मल त्याग की इच्छा हो तो उसे टालें नहीं।",
    ),
    safety: L(
      "If you have heart, joint or other health problems, choose activity your doctor agrees is safe.",
      "இதயம், மூட்டு அல்லது வேறு உடல்நலப் பிரச்சினைகள் இருந்தால், மருத்துவர் பாதுகாப்பானது என்று ஒப்புக்கொள்ளும் செயல்பாட்டைத் தேர்ந்தெடுங்கள்.",
      "दिल, जोड़ों या दूसरी स्वास्थ्य समस्याएँ हों तो वह गतिविधि चुनें जिसे आपका डॉक्टर सुरक्षित माने।",
    ),
    more: L(
      "Long periods of sitting slow the gut. A regular daily routine — similar meal times and a regular toilet time — also helps many people.",
      "நீண்ட நேரம் உட்கார்ந்திருப்பது குடல் இயக்கத்தை மெதுவாக்கும். சீரான தினசரி நடைமுறை — ஒரே மாதிரியான உணவு நேரம், சீரான கழிவறை நேரம் — பலருக்கு உதவும்.",
      "लंबे समय तक बैठे रहने से आँतें धीमी हो जाती हैं। नियमित दिनचर्या — एक जैसे भोजन का समय और शौच का नियमित समय — भी कई लोगों की मदद करती है।",
    ),
  },
  {
    id: "warm-lemon-ginger-water",
    category: "digestion",
    evidence: "limited",
    keywords: ["lemon", "ginger", "warm water", "morning"],
    title: L(
      "Warm water with lemon or ginger (optional)",
      "எலுமிச்சை அல்லது இஞ்சியுடன் வெதுவெதுப்பான நீர் (விருப்பத்தேர்வு)",
      "नींबू या अदरक के साथ गुनगुना पानी (वैकल्पिक)",
    ),
    summary: L(
      "Many people find a warm drink in the morning comforting for digestion. It is an optional habit, not a proven cure.",
      "காலையில் வெதுவெதுப்பான பானம் செரிமானத்துக்கு இதமாக இருப்பதாகப் பலர் உணர்கிறார்கள். இது ஒரு விருப்பப் பழக்கம், நிரூபிக்கப்பட்ட மருந்து அல்ல.",
      "कई लोगों को सुबह गुनगुना पेय पाचन के लिए आरामदायक लगता है। यह एक वैकल्पिक आदत है, कोई साबित इलाज नहीं।",
    ),
    suggestion: L(
      "A glass of warm water with a squeeze of lemon or a slice of ginger.",
      "ஒரு டம்ளர் வெதுவெதுப்பான நீரில் சிறிது எலுமிச்சைச் சாறு அல்லது ஒரு துண்டு இஞ்சி.",
      "एक गिलास गुनगुने पानी में थोड़ा नींबू का रस या अदरक का एक टुकड़ा।",
    ),
    howTo: L(
      "Drink it warm, not hot. Rinse your mouth with plain water afterwards to protect your teeth from the acid.",
      "சூடாக அல்ல, வெதுவெதுப்பாகக் குடியுங்கள். அமிலத்திலிருந்து பற்களைக் காக்க, பிறகு வெற்று நீரில் வாய் கொப்பளியுங்கள்.",
      "गरम नहीं, गुनगुना पिएँ। दाँतों को अम्ल से बचाने के लिए बाद में सादे पानी से कुल्ला करें।",
    ),
    safety: L(
      "Lemon can worsen acid reflux or heartburn. People with kidney disease or a prescribed fluid restriction should follow their clinician's advice.",
      "எலுமிச்சை நெஞ்செரிச்சலை அதிகரிக்கலாம். சிறுநீரக நோய் அல்லது பரிந்துரைக்கப்பட்ட திரவக் கட்டுப்பாடு உள்ளவர்கள் மருத்துவரின் ஆலோசனையைப் பின்பற்ற வேண்டும்.",
      "नींबू से एसिडिटी या सीने में जलन बढ़ सकती है। किडनी रोग या तय की गई तरल-सीमा वाले लोग अपने डॉक्टर की सलाह मानें।",
    ),
    more: L(
      "There is little scientific research on lemon water for digestion; any benefit probably comes from the extra fluid and a regular morning routine. It does not 'detox' the body.",
      "செரிமானத்துக்கு எலுமிச்சை நீர் பற்றி அறிவியல் ஆய்வுகள் மிகக் குறைவு; ஏதேனும் பயன் இருந்தால் அது கூடுதல் நீரிலிருந்தும் சீரான காலை நடைமுறையிலிருந்தும் வரலாம். இது உடலை 'நச்சுநீக்கம்' செய்யாது.",
      "पाचन के लिए नींबू पानी पर वैज्ञानिक शोध बहुत कम है; कोई फ़ायदा शायद अतिरिक्त पानी और सुबह की नियमित दिनचर्या से आता है। यह शरीर को 'डिटॉक्स' नहीं करता।",
    ),
  },
  {
    id: "scalp-massage",
    category: "hairSkin",
    evidence: "limited",
    keywords: ["scalp", "hair oil", "massage", "coconut oil", "hair fall"],
    title: L(
      "Gentle scalp massage",
      "மென்மையான தலைச்சரும மசாஜ்",
      "सिर की हल्की मालिश",
    ),
    summary: L(
      "A gentle scalp massage can feel relaxing. A few small studies suggest possible benefits for hair thickness, but the evidence is limited.",
      "மென்மையான தலை மசாஜ் இதமாக இருக்கும். முடி அடர்த்திக்குப் பயன் இருக்கலாம் எனச் சில சிறிய ஆய்வுகள் கூறுகின்றன, ஆனால் சான்று குறைவு.",
      "सिर की हल्की मालिश आरामदायक लग सकती है। कुछ छोटे अध्ययन बालों के घनेपन में संभावित फ़ायदा बताते हैं, पर प्रमाण सीमित हैं।",
    ),
    suggestion: L(
      "Fingertip massage, with or without a little coconut or sesame oil.",
      "விரல் நுனிகளால் மசாஜ், சிறிது தேங்காய் அல்லது நல்லெண்ணெயுடனோ இல்லாமலோ.",
      "उंगलियों के पोरों से मालिश, थोड़े नारियल या तिल के तेल के साथ या बिना।",
    ),
    howTo: L(
      "Use your fingertips (not nails) in small circles for a few minutes, a few times a week. Wash the oil out if your scalp becomes oily or itchy.",
      "நகங்களால் அல்ல, விரல் நுனிகளால் சிறு வட்டங்களாக சில நிமிடங்கள், வாரத்துக்குச் சில முறை மசாஜ் செய்யுங்கள். தலை எண்ணெய்ப்பசையாக அல்லது அரிப்பாக இருந்தால் எண்ணெயைக் கழுவிவிடுங்கள்.",
      "नाख़ून नहीं, उंगलियों के पोरों से छोटे-छोटे गोलों में कुछ मिनट, हफ़्ते में कुछ बार मालिश करें। सिर चिपचिपा या खुजलीदार हो तो तेल धो लें।",
    ),
    safety: L(
      "Home massage will not regrow lost hair. Do not rub hard on a sore, flaky or infected scalp, and see a doctor for sudden or patchy hair loss. Patch-test any new oil on a small area of skin first.",
      "வீட்டு மசாஜ் உதிர்ந்த முடியை மீண்டும் வளர்க்காது. புண், செதில், தொற்று உள்ள தலையில் அழுத்தித் தேய்க்காதீர்கள்; திடீர் அல்லது திட்டுத் திட்டான முடி உதிர்வுக்கு மருத்துவரைப் பாருங்கள். எந்தப் புதிய எண்ணெயையும் முதலில் சிறிய தோல் பகுதியில் பேட்ச் சோதனை செய்யுங்கள்.",
      "घर पर मालिश से झड़े बाल वापस नहीं उगते। घाव, पपड़ी या संक्रमण वाले सिर पर ज़ोर से न रगड़ें, और अचानक या पैच में बाल झड़ें तो डॉक्टर को दिखाएँ। कोई भी नया तेल पहले त्वचा के छोटे हिस्से पर पैच टेस्ट करें।",
    ),
    more: L(
      "Hair growth depends on genes, hormones, nutrition, stress and illness. Oiling and massage are traditional grooming habits in India; they can improve how hair feels but are not a treatment for hair loss.",
      "முடி வளர்ச்சி மரபணு, ஹார்மோன்கள், ஊட்டச்சத்து, மன அழுத்தம், நோய் ஆகியவற்றைப் பொறுத்தது. எண்ணெய் தேய்த்தலும் மசாஜும் இந்தியாவில் பாரம்பரியப் பராமரிப்புப் பழக்கங்கள்; முடியின் உணர்வை மேம்படுத்தலாம், ஆனால் முடி உதிர்வுக்குச் சிகிச்சை அல்ல.",
      "बालों का बढ़ना जीन, हार्मोन, पोषण, तनाव और बीमारी पर निर्भर करता है। तेल लगाना और मालिश भारत में पारंपरिक देखभाल की आदतें हैं; ये बालों का एहसास बेहतर कर सकती हैं, पर बाल झड़ने का इलाज नहीं हैं।",
    ),
  },
  {
    id: "hibiscus-hair",
    category: "hairSkin",
    evidence: "traditional",
    keywords: ["hibiscus", "sembaruthi", "gudhal", "hair pack"],
    title: L(
      "Hibiscus in traditional hair care",
      "பாரம்பரிய முடி பராமரிப்பில் செம்பருத்தி",
      "पारंपरिक बालों की देखभाल में गुड़हल",
    ),
    summary: L(
      "Hibiscus (sembaruthi, gudhal) flowers and leaves are used in traditional hair oils and packs. There is little scientific evidence in people.",
      "செம்பருத்திப் பூக்களும் இலைகளும் பாரம்பரிய முடி எண்ணெய், பேக்குகளில் பயன்படுகின்றன. மனிதர்களில் அறிவியல் சான்று மிகக் குறைவு.",
      "गुड़हल के फूल और पत्ते पारंपरिक बालों के तेल और पैक में इस्तेमाल होते हैं। इंसानों में वैज्ञानिक प्रमाण बहुत कम हैं।",
    ),
    suggestion: L(
      "Hibiscus leaf paste as a hair wash, or hibiscus-infused coconut oil.",
      "தலைக்குக் குளிக்க செம்பருத்தி இலை அரைப்பு, அல்லது செம்பருத்தி கலந்த தேங்காய் எண்ணெய்.",
      "बाल धोने के लिए गुड़हल के पत्तों का पेस्ट, या गुड़हल वाला नारियल तेल।",
    ),
    howTo: L(
      "Patch-test first. Apply the paste to the scalp and hair for 15–20 minutes, then rinse well.",
      "முதலில் பேட்ச் சோதனை செய்யுங்கள். அரைப்பைத் தலையிலும் முடியிலும் 15–20 நிமிடங்கள் வைத்து, பிறகு நன்கு அலசுங்கள்.",
      "पहले पैच टेस्ट करें। पेस्ट को सिर और बालों पर 15–20 मिनट लगाएँ, फिर अच्छी तरह धो लें।",
    ),
    safety: L(
      "Patch test: apply a small amount behind the ear or on the inner forearm and wait 24–48 hours; do not use it if redness, itching or swelling appears. Hibiscus will not regrow hair.",
      "பேட்ச் சோதனை: காதுக்குப் பின்னால் அல்லது உள் முன்கையில் சிறிதளவு தடவி 24–48 மணி நேரம் காத்திருங்கள்; சிவப்பு, அரிப்பு, வீக்கம் வந்தால் பயன்படுத்தாதீர்கள். செம்பருத்தி முடியை மீண்டும் வளர்க்காது.",
      "पैच टेस्ट: थोड़ी मात्रा कान के पीछे या बाँह के अंदरूनी हिस्से पर लगाकर 24–48 घंटे रुकें; लाली, खुजली या सूजन हो तो इस्तेमाल न करें। गुड़हल से बाल दोबारा नहीं उगते।",
    ),
    more: L(
      "Traditional use: Siddha and Ayurveda use hibiscus to condition hair and soothe the scalp. Scientific evidence: mainly animal and laboratory studies; good human trials are lacking. Do not drink hibiscus preparations in pregnancy without advice.",
      "பாரம்பரியப் பயன்பாடு: சித்த, ஆயுர்வேத மருத்துவங்கள் முடியைப் பராமரிக்கவும் தலைச்சருமத்தை இதமாக்கவும் செம்பருத்தியைப் பயன்படுத்துகின்றன. அறிவியல் சான்று: பெரும்பாலும் விலங்கு, ஆய்வக ஆய்வுகள் மட்டுமே; நல்ல மனித ஆய்வுகள் இல்லை. கர்ப்ப காலத்தில் ஆலோசனையின்றி செம்பருத்தித் தயாரிப்புகளைக் குடிக்காதீர்கள்.",
      "पारंपरिक उपयोग: सिद्ध और आयुर्वेद बालों को पोषण देने और सिर की त्वचा को आराम देने के लिए गुड़हल इस्तेमाल करते हैं। वैज्ञानिक प्रमाण: ज़्यादातर पशु और लैब अध्ययन; इंसानों पर अच्छे परीक्षण नहीं हैं। गर्भावस्था में सलाह के बिना गुड़हल से बनी चीज़ें न पिएँ।",
    ),
  },
  {
    id: "aloe-vera",
    category: "hairSkin",
    evidence: "limited",
    keywords: ["aloe vera", "kathalai", "sunburn", "dry skin"],
    title: L(
      "Aloe vera gel for soothing skin",
      "தோலை இதமாக்க கற்றாழை ஜெல்",
      "त्वचा को आराम देने के लिए एलोवेरा जेल",
    ),
    summary: L(
      "Aloe vera gel may soothe minor sunburn and dry skin. The evidence is limited and mixed.",
      "கற்றாழை ஜெல் லேசான வெயில் கருக்கத்தையும் வறண்ட தோலையும் இதமாக்கலாம். சான்று குறைவாகவும் கலவையாகவும் உள்ளது.",
      "एलोवेरा जेल हल्की धूप की जलन और रूखी त्वचा में आराम दे सकता है। प्रमाण सीमित और मिले-जुले हैं।",
    ),
    suggestion: L(
      "Clear gel from the inner leaf, or a plain aloe gel product.",
      "இலையின் உள்ளே உள்ள தெளிவான ஜெல், அல்லது வெறுமையான கற்றாழை ஜெல் பொருள்.",
      "पत्ते के अंदर का साफ़ जेल, या सादा एलोवेरा जेल उत्पाद।",
    ),
    howTo: L(
      "Patch-test first, then apply a thin layer to clean, unbroken skin.",
      "முதலில் பேட்ச் சோதனை செய்து, பிறகு சுத்தமான, காயமில்லாத தோலில் மெல்லிய அடுக்காகத் தடவுங்கள்.",
      "पहले पैच टेस्ट करें, फिर साफ़, बिना कटी-फटी त्वचा पर पतली परत लगाएँ।",
    ),
    safety: L(
      "Patch-test on a small area for 24–48 hours. Do not put it on deep wounds or serious burns — seek medical care. Do not swallow aloe latex (the yellow sap); it is a strong laxative.",
      "சிறிய பகுதியில் 24–48 மணி நேரம் பேட்ச் சோதனை செய்யுங்கள். ஆழமான காயங்கள் அல்லது தீவிரத் தீக்காயங்களில் தடவாதீர்கள் — மருத்துவ உதவி பெறுங்கள். கற்றாழையின் மஞ்சள் சாற்றை (லேடெக்ஸ்) விழுங்காதீர்கள்; அது கடுமையான மலமிளக்கி.",
      "छोटी जगह पर 24–48 घंटे पैच टेस्ट करें। गहरे घाव या गंभीर जलने पर न लगाएँ — इलाज लें। एलोवेरा का पीला रस (लेटेक्स) न निगलें; यह तेज़ जुलाब है।",
    ),
    more: L(
      "Traditional use: aloe (kumari, sotru kathalai) is widely used for skin in Ayurveda and Siddha. Scientific evidence: some studies suggest help with minor burns, but results are inconsistent. Stop if it stings or causes a rash.",
      "பாரம்பரியப் பயன்பாடு: கற்றாழை (குமாரி, சோற்றுக் கற்றாழை) ஆயுர்வேதம், சித்த மருத்துவத்தில் தோலுக்குப் பரவலாகப் பயன்படுகிறது. அறிவியல் சான்று: லேசான தீக்காயங்களுக்கு உதவலாம் எனச் சில ஆய்வுகள் கூறுகின்றன, ஆனால் முடிவுகள் ஒத்துப்போகவில்லை. எரிச்சல் அல்லது தடிப்பு வந்தால் நிறுத்துங்கள்.",
      "पारंपरिक उपयोग: आयुर्वेद और सिद्ध में एलोवेरा (घृतकुमारी) त्वचा के लिए ख़ूब इस्तेमाल होता है। वैज्ञानिक प्रमाण: कुछ अध्ययन हल्की जलन में मदद बताते हैं, पर नतीजे एक जैसे नहीं हैं। चुभन या दाने हों तो बंद कर दें।",
    ),
  },
  {
    id: "gentle-skin-care",
    category: "hairSkin",
    evidence: "habit",
    keywords: ["skin", "moisturiser", "sunscreen", "soap", "eczema"],
    title: L(
      "Gentle everyday skin care",
      "மென்மையான அன்றாடத் தோல் பராமரிப்பு",
      "रोज़ की हल्की त्वचा देखभाल",
    ),
    summary: L(
      "Simple, gentle care protects the skin barrier better than many products.",
      "பல பொருட்களை விட எளிய, மென்மையான பராமரிப்பு தோலின் பாதுகாப்பு அடுக்கை நன்றாகக் காக்கும்.",
      "कई उत्पादों के बजाय सरल, हल्की देखभाल त्वचा की सुरक्षा परत को बेहतर बचाती है।",
    ),
    suggestion: L(
      "A mild soap or cleanser, a plain moisturiser or coconut oil for dry skin, and sun protection.",
      "மென்மையான சோப் அல்லது கிளென்சர், வறண்ட தோலுக்கு வெறுமையான மாய்ஸ்சரைசர் அல்லது தேங்காய் எண்ணெய், வெயில் பாதுகாப்பு.",
      "हल्का साबुन या क्लींज़र, रूखी त्वचा के लिए सादा मॉइस्चराइज़र या नारियल तेल, और धूप से बचाव।",
    ),
    howTo: L(
      "Wash with lukewarm water, pat dry, moisturise while the skin is slightly damp, and use shade, clothing or sunscreen in strong sun.",
      "வெதுவெதுப்பான நீரில் கழுவி, மெதுவாக ஒற்றித் துடைத்து, தோல் சற்று ஈரமாக இருக்கும்போதே மாய்ஸ்சரைசர் தடவுங்கள்; கடும் வெயிலில் நிழல், ஆடை அல்லது சன்ஸ்கிரீன் பயன்படுத்துங்கள்.",
      "गुनगुने पानी से धोएँ, थपथपाकर सुखाएँ, त्वचा थोड़ी नम रहते ही मॉइस्चराइज़र लगाएँ, और तेज़ धूप में छाँव, कपड़े या सनस्क्रीन इस्तेमाल करें।",
    ),
    safety: L(
      "Patch-test new products. Avoid unlabelled skin-lightening or 'fairness' creams — some contain steroids or mercury that can harm the skin.",
      "புதிய பொருட்களுக்கு பேட்ச் சோதனை செய்யுங்கள். லேபிள் இல்லாத தோல் வெளுப்பு அல்லது 'சிவப்பழகு' கிரீம்களைத் தவிருங்கள் — சிலவற்றில் தோலைப் பாதிக்கும் ஸ்டீராய்டுகள் அல்லது பாதரசம் இருக்கலாம்.",
      "नए उत्पादों का पैच टेस्ट करें। बिना लेबल वाली त्वचा गोरी करने वाली 'फ़ेयरनेस' क्रीम से बचें — कुछ में स्टेरॉयड या पारा होता है जो त्वचा को नुक़सान पहुँचा सकता है।",
    ),
    more: L(
      "Harsh scrubbing, very hot water and frequent use of strong soaps can dry and irritate the skin. Fewer, gentler products are usually better, especially for sensitive or eczema-prone skin.",
      "கடுமையாகத் தேய்த்தல், மிகச் சூடான நீர், கடுமையான சோப்புகளை அடிக்கடி பயன்படுத்துதல் தோலை வறளச் செய்து எரிச்சலூட்டலாம். குறிப்பாக உணர்திறன் மிக்க அல்லது எக்ஸிமா உள்ள தோலுக்கு, குறைவான, மென்மையான பொருட்களே பொதுவாகச் சிறந்தவை.",
      "ज़ोर से रगड़ना, बहुत गरम पानी और तेज़ साबुन का बार-बार इस्तेमाल त्वचा को रूखा और परेशान कर सकता है। कम और हल्के उत्पाद आमतौर पर बेहतर होते हैं, ख़ासकर संवेदनशील या एक्ज़िमा वाली त्वचा के लिए।",
    ),
  },
  {
    id: "hair-skin-doctor",
    category: "hairSkin",
    evidence: "habit",
    keywords: ["hair loss", "rash", "dermatologist", "mole", "doctor"],
    title: L(
      "When hair or skin problems need a doctor",
      "முடி அல்லது தோல் பிரச்சினைகளுக்கு எப்போது மருத்துவர் தேவை",
      "बाल या त्वचा की समस्या में डॉक्टर कब ज़रूरी",
    ),
    summary: L(
      "Some hair and skin changes are signs of conditions such as thyroid problems, anaemia, fungal infection or eczema that need proper treatment.",
      "சில முடி, தோல் மாற்றங்கள் தைராய்டு பிரச்சினை, இரத்தசோகை, பூஞ்சைத் தொற்று அல்லது எக்ஸிமா போன்றவற்றின் அறிகுறியாக இருக்கலாம்; அவற்றுக்கு முறையான சிகிச்சை தேவை.",
      "बाल और त्वचा के कुछ बदलाव थायरॉइड, ख़ून की कमी, फ़ंगल संक्रमण या एक्ज़िमा जैसी स्थितियों के संकेत हो सकते हैं, जिनका सही इलाज ज़रूरी है।",
    ),
    suggestion: L(
      "See a doctor or dermatologist instead of trying more home remedies.",
      "மேலும் வீட்டு வைத்தியங்களை முயற்சிப்பதற்குப் பதிலாக மருத்துவர் அல்லது தோல் மருத்துவரைப் பாருங்கள்.",
      "और घरेलू नुस्ख़े आज़माने के बजाय डॉक्टर या त्वचा विशेषज्ञ को दिखाएँ।",
    ),
    howTo: L(
      "Seek advice for hair loss that is sudden, patchy or lasts more than 3 months; a rash that spreads, blisters or does not improve in 2 weeks; a mole that changes; or a wound that will not heal.",
      "இவற்றுக்கு ஆலோசனை பெறுங்கள்: திடீர், திட்டுத் திட்டான அல்லது 3 மாதங்களுக்கு மேல் நீடிக்கும் முடி உதிர்வு; பரவும், கொப்புளமாகும் அல்லது 2 வாரத்தில் சரியாகாத தடிப்பு; மாறும் மச்சம்; ஆறாத புண்.",
      "इनमें सलाह लें: अचानक, पैच में या 3 महीने से ज़्यादा बाल झड़ना; फैलते, फफोले वाले या 2 हफ़्ते में न सुधरने वाले दाने; बदलता हुआ तिल; या न भरने वाला घाव।",
    ),
    safety: L(
      "Get urgent care for a rash with fever, swelling of the face or lips, difficulty breathing, or skin that quickly becomes red, hot and painful. Call 112 in an emergency.",
      "காய்ச்சலுடன் தடிப்பு, முகம் அல்லது உதடு வீக்கம், மூச்சுத் திணறல், அல்லது வேகமாகச் சிவந்து, சூடாகி, வலிக்கும் தோல் இருந்தால் உடனடி மருத்துவ உதவி பெறுங்கள். அவசர நிலையில் 112 ஐ அழையுங்கள்.",
      "बुख़ार के साथ दाने, चेहरे या होंठों पर सूजन, साँस लेने में तकलीफ़, या तेज़ी से लाल, गरम और दर्दनाक होती त्वचा हो तो तुरंत इलाज लें। आपात स्थिति में 112 पर कॉल करें।",
    ),
    more: L(
      "Early treatment works better for many hair and skin conditions. Do not use steroid creams without a prescription; they can worsen fungal infections and thin the skin.",
      "பல முடி, தோல் பிரச்சினைகளுக்கு ஆரம்ப நிலைச் சிகிச்சை சிறப்பாகப் பயன்தரும். மருந்துச்சீட்டு இல்லாமல் ஸ்டீராய்டு கிரீம்களைப் பயன்படுத்தாதீர்கள்; அவை பூஞ்சைத் தொற்றை மோசமாக்கி, தோலை மெலிதாக்கலாம்.",
      "कई बाल और त्वचा समस्याओं में जल्दी इलाज बेहतर काम करता है। बिना पर्चे के स्टेरॉयड क्रीम इस्तेमाल न करें; ये फ़ंगल संक्रमण बिगाड़ सकती हैं और त्वचा पतली कर सकती हैं।",
    ),
  },
  {
    id: "liver-kidney-diet",
    category: "liverKidney",
    evidence: "food",
    keywords: ["fatty liver", "kidney", "salt", "diet", "liver"],
    title: L(
      "Balanced eating for liver and kidney health",
      "கல்லீரல், சிறுநீரக நலனுக்குச் சமச்சீர் உணவு",
      "लिवर और किडनी की सेहत के लिए संतुलित भोजन",
    ),
    summary: L(
      "Keeping a healthy weight, limiting salt, sugar and fried food, and eating whole foods supports the liver and kidneys.",
      "ஆரோக்கியமான எடையைப் பேணுதல், உப்பு, சர்க்கரை, பொரித்த உணவுகளைக் குறைத்தல், முழு உணவுகளைச் சாப்பிடுதல் கல்லீரலுக்கும் சிறுநீரகத்துக்கும் உதவும்.",
      "स्वस्थ वज़न रखना, नमक, चीनी और तली चीज़ें कम करना, और प्राकृतिक भोजन खाना लिवर और किडनी की मदद करता है।",
    ),
    suggestion: L(
      "Vegetables, whole grains, dal and fruit — with less salt, pickles, papad, sweets and sugary drinks.",
      "காய்கறிகள், முழு தானியங்கள், பருப்பு, பழங்கள் — குறைவான உப்பு, ஊறுகாய், அப்பளம், இனிப்புகள், இனிப்புப் பானங்களுடன்.",
      "सब्ज़ियाँ, साबुत अनाज, दाल और फल — कम नमक, अचार, पापड़, मिठाई और मीठे पेय के साथ।",
    ),
    howTo: L(
      "Fatty liver often improves with gradual weight loss and regular activity. Keep blood sugar and blood pressure under control.",
      "படிப்படியான எடைக் குறைப்பாலும் சீரான உடற்பயிற்சியாலும் கொழுப்புக் கல்லீரல் பெரும்பாலும் மேம்படும். இரத்தச் சர்க்கரையையும் இரத்த அழுத்தத்தையும் கட்டுக்குள் வையுங்கள்.",
      "फ़ैटी लिवर अक्सर धीरे-धीरे वज़न घटाने और नियमित सक्रियता से सुधरता है। ब्लड शुगर और ब्लड प्रेशर को नियंत्रण में रखें।",
    ),
    safety: L(
      "People with kidney or liver disease may need specific limits on protein, salt, potassium or fluids — follow your doctor's or dietitian's plan rather than general advice.",
      "சிறுநீரக அல்லது கல்லீரல் நோய் உள்ளவர்களுக்கு புரதம், உப்பு, பொட்டாசியம் அல்லது திரவங்களில் குறிப்பிட்ட கட்டுப்பாடுகள் தேவைப்படலாம் — பொது ஆலோசனையை விட மருத்துவர் அல்லது உணவியல் நிபுணரின் திட்டத்தைப் பின்பற்றுங்கள்.",
      "किडनी या लिवर रोग वाले लोगों को प्रोटीन, नमक, पोटैशियम या तरल पर ख़ास सीमाएँ चाहिए हो सकती हैं — आम सलाह के बजाय अपने डॉक्टर या डाइटीशियन की योजना मानें।",
    ),
    more: L(
      "Diabetes and high blood pressure are the commonest causes of kidney disease in India, and excess weight is a major cause of fatty liver. Regular check-ups help find problems early.",
      "இந்தியாவில் சிறுநீரக நோய்க்கு நீரிழிவும் உயர் இரத்த அழுத்தமும் பொதுவான காரணங்கள்; அதிக எடை கொழுப்புக் கல்லீரலுக்கு முக்கியக் காரணம். சீரான பரிசோதனைகள் பிரச்சினைகளை முன்கூட்டியே கண்டறிய உதவும்.",
      "भारत में किडनी रोग के सबसे आम कारण मधुमेह और हाई ब्लड प्रेशर हैं, और ज़्यादा वज़न फ़ैटी लिवर का बड़ा कारण है। नियमित जाँच से समस्याएँ जल्दी पकड़ में आती हैं।",
    ),
  },
  {
    id: "kidney-fluids",
    category: "liverKidney",
    evidence: "habit",
    keywords: ["kidney stones", "water", "fluids", "dialysis", "urine"],
    title: L(
      "Fluids that suit your condition",
      "உங்கள் உடல்நிலைக்கு ஏற்ற திரவ அளவு",
      "अपनी स्थिति के अनुसार तरल",
    ),
    summary: L(
      "For most healthy people, enough water helps the kidneys and may lower the risk of some kidney stones. But some conditions need fluid limits.",
      "பெரும்பாலான ஆரோக்கியமானவர்களுக்கு, போதுமான தண்ணீர் சிறுநீரகங்களுக்கு உதவும், சில வகை சிறுநீரகக் கற்களின் அபாயத்தைக் குறைக்கலாம். ஆனால் சில நோய்களில் திரவக் கட்டுப்பாடு தேவை.",
      "ज़्यादातर स्वस्थ लोगों के लिए पर्याप्त पानी किडनी की मदद करता है और कुछ किडनी स्टोन का ख़तरा कम कर सकता है। लेकिन कुछ स्थितियों में तरल की सीमा ज़रूरी होती है।",
    ),
    suggestion: L(
      "Water spread through the day, with more in hot weather or when sweating heavily.",
      "நாள் முழுவதும் பகிர்ந்து குடிக்கும் தண்ணீர்; வெயிலில் அல்லது அதிக வியர்வையில் கூடுதலாக.",
      "दिन भर बाँटकर पानी, और गर्मी या ज़्यादा पसीने में ज़्यादा।",
    ),
    howTo: L(
      "If you have had kidney stones, your doctor may suggest a daily target. Pale-yellow urine is a simple guide for healthy adults.",
      "உங்களுக்கு சிறுநீரகக் கல் இருந்திருந்தால், மருத்துவர் தினசரி இலக்கைப் பரிந்துரைக்கலாம். ஆரோக்கியமான பெரியவர்களுக்கு வெளிர் மஞ்சள் சிறுநீர் ஒரு எளிய வழிகாட்டி.",
      "अगर आपको किडनी स्टोन रहा है तो डॉक्टर रोज़ का लक्ष्य बता सकते हैं। स्वस्थ वयस्कों के लिए हल्के पीले रंग का पेशाब एक आसान संकेत है।",
    ),
    safety: L(
      "If you have kidney failure, are on dialysis, or have heart failure or advanced liver disease with swelling, drink only the amount your doctor advises — too much can be dangerous.",
      "சிறுநீரகச் செயலிழப்பு, டயாலிசிஸ், அல்லது இதயச் செயலிழப்பு அல்லது வீக்கத்துடன் கூடிய முற்றிய கல்லீரல் நோய் இருந்தால், மருத்துவர் சொல்லும் அளவு மட்டுமே குடியுங்கள் — அதிகமாகக் குடிப்பது ஆபத்தானது.",
      "अगर आपको किडनी फ़ेलियर है, डायलिसिस पर हैं, या हार्ट फ़ेलियर या सूजन के साथ गंभीर लिवर रोग है, तो डॉक्टर जितना कहें उतना ही पिएँ — ज़्यादा पीना ख़तरनाक हो सकता है।",
    ),
    more: L(
      "Get prompt medical assessment for blood in the urine, much less urine than usual, severe pain in the side or back, or swelling of the legs or face.",
      "சிறுநீரில் இரத்தம், வழக்கத்தை விட மிகக் குறைந்த சிறுநீர், விலா அல்லது முதுகில் கடும் வலி, கால்கள் அல்லது முகம் வீக்கம் இருந்தால் உடனடியாக மருத்துவப் பரிசோதனை பெறுங்கள்.",
      "पेशाब में ख़ून, सामान्य से बहुत कम पेशाब, बग़ल या पीठ में तेज़ दर्द, या पैरों या चेहरे पर सूजन हो तो तुरंत डॉक्टर को दिखाएँ।",
    ),
  },
  {
    id: "hepatitis-prevention",
    category: "liverKidney",
    evidence: "habit",
    keywords: ["hepatitis", "jaundice", "vaccine", "food safety", "hygiene"],
    title: L(
      "Safe food and water to prevent hepatitis",
      "ஹெபடைடிஸைத் தடுக்கப் பாதுகாப்பான உணவும் நீரும்",
      "हेपेटाइटिस से बचाव के लिए सुरक्षित भोजन और पानी",
    ),
    summary: L(
      "Hepatitis A and E spread through contaminated food and water. Hepatitis B and C spread through blood and body fluids.",
      "ஹெபடைடிஸ் A, E அசுத்தமான உணவு, நீர் மூலம் பரவும். ஹெபடைடிஸ் B, C இரத்தம், உடல் திரவங்கள் மூலம் பரவும்.",
      "हेपेटाइटिस A और E दूषित भोजन और पानी से फैलते हैं। हेपेटाइटिस B और C ख़ून और शरीर के तरल पदार्थों से फैलते हैं।",
    ),
    suggestion: L(
      "Boiled or purified water, freshly cooked hot food, clean hands, and hepatitis B vaccination.",
      "கொதிக்கவைத்த அல்லது சுத்திகரிக்கப்பட்ட நீர், புதிதாகச் சமைத்த சூடான உணவு, சுத்தமான கைகள், ஹெபடைடிஸ் B தடுப்பூசி.",
      "उबला या शुद्ध पानी, ताज़ा पका गरम खाना, साफ़ हाथ, और हेपेटाइटिस B का टीका।",
    ),
    howTo: L(
      "Wash hands with soap before eating and after using the toilet; avoid uncovered street food and cut fruit; never share razors, needles or toothbrushes.",
      "சாப்பிடும் முன்பும் கழிவறையைப் பயன்படுத்திய பின்பும் சோப்பால் கைகளைக் கழுவுங்கள்; மூடப்படாத தெரு உணவு, வெட்டி வைத்த பழங்களைத் தவிருங்கள்; ரேசர், ஊசி, பல் துலக்கியை ஒருபோதும் பகிராதீர்கள்.",
      "खाने से पहले और शौचालय के बाद साबुन से हाथ धोएँ; खुला रखा स्ट्रीट फ़ूड और कटे फल न खाएँ; रेज़र, सुई या टूथब्रश कभी साझा न करें।",
    ),
    safety: L(
      "Yellow eyes or skin (jaundice), dark urine, pale stools or severe vomiting need prompt medical assessment. Hepatitis in pregnancy, especially hepatitis E, can be serious — see a doctor quickly.",
      "கண்கள் அல்லது தோல் மஞ்சளாதல் (மஞ்சள் காமாலை), அடர் நிறச் சிறுநீர், வெளிறிய மலம், கடும் வாந்தி இருந்தால் உடனடியாக மருத்துவப் பரிசோதனை தேவை. கர்ப்ப காலத்தில் ஹெபடைடிஸ், குறிப்பாக ஹெபடைடிஸ் E, தீவிரமாகலாம் — விரைவில் மருத்துவரைப் பாருங்கள்.",
      "आँखों या त्वचा का पीला होना (पीलिया), गहरे रंग का पेशाब, फीका मल या तेज़ उल्टी हो तो तुरंत डॉक्टरी जाँच ज़रूरी है। गर्भावस्था में हेपेटाइटिस, ख़ासकर हेपेटाइटिस E, गंभीर हो सकता है — जल्दी डॉक्टर को दिखाएँ।",
    ),
    more: L(
      "Hepatitis B vaccine is part of India's routine immunisation for babies and is recommended for many adults at risk. Ask your doctor about testing for hepatitis B and C if you may have been exposed.",
      "ஹெபடைடிஸ் B தடுப்பூசி இந்தியாவின் குழந்தைகளுக்கான வழக்கமான தடுப்பூசித் திட்டத்தின் பகுதி; அபாயம் உள்ள பல பெரியவர்களுக்கும் பரிந்துரைக்கப்படுகிறது. நோய்த்தொற்றுக்கு ஆளாகியிருக்கலாம் என்றால் ஹெபடைடிஸ் B, C பரிசோதனை பற்றி மருத்துவரிடம் கேளுங்கள்.",
      "हेपेटाइटिस B का टीका भारत में शिशुओं के नियमित टीकाकरण का हिस्सा है और जोखिम वाले कई वयस्कों के लिए भी सुझाया जाता है। अगर संक्रमण के संपर्क में आने की आशंका हो तो हेपेटाइटिस B और C की जाँच के बारे में डॉक्टर से पूछें।",
    ),
  },
  {
    id: "keezhanelli-liver",
    category: "liverKidney",
    evidence: "limited",
    keywords: ["keezhanelli", "bhumi amla", "phyllanthus", "jaundice", "hepatitis"],
    title: L(
      "Keezhanelli for liver problems: evidence limits",
      "கல்லீரல் பிரச்சினைகளுக்கு கீழாநெல்லி: சான்றின் வரம்புகள்",
      "लिवर की समस्या में भूमि आंवला: प्रमाण की सीमाएँ",
    ),
    summary: L(
      "Keezhanelli is a popular traditional remedy for jaundice in Tamil Nadu and elsewhere in India. It has not been shown to clear hepatitis or to heal liver or kidney disease.",
      "தமிழ்நாட்டிலும் இந்தியாவின் பிற இடங்களிலும் மஞ்சள் காமாலைக்கு கீழாநெல்லி பிரபலமான பாரம்பரிய மருந்து. ஹெபடைடிஸை நீக்குவதாகவோ கல்லீரல், சிறுநீரக நோயைக் குணப்படுத்துவதாகவோ நிரூபிக்கப்படவில்லை.",
      "भूमि आंवला तमिलनाडु और भारत के दूसरे हिस्सों में पीलिया का लोकप्रिय पारंपरिक नुस्ख़ा है। यह साबित नहीं हुआ है कि यह हेपेटाइटिस मिटाता है या लिवर या किडनी रोग ठीक करता है।",
    ),
    suggestion: L(
      "Get the cause of jaundice diagnosed by a doctor first, and discuss any herbal remedy with them.",
      "முதலில் மஞ்சள் காமாலைக்கான காரணத்தை மருத்துவர் மூலம் கண்டறியுங்கள்; எந்த மூலிகை மருந்தையும் அவருடன் கலந்து பேசுங்கள்.",
      "पहले डॉक्टर से पीलिया का कारण पता करवाएँ, और कोई भी जड़ी-बूटी उनसे सलाह करके ही लें।",
    ),
    howTo: L(
      "Never stop or delay prescribed hepatitis or liver medicines for an herbal remedy. Tell your doctor about every herb or supplement you take.",
      "மூலிகை மருந்துக்காக, பரிந்துரைக்கப்பட்ட ஹெபடைடிஸ் அல்லது கல்லீரல் மருந்துகளை ஒருபோதும் நிறுத்தவோ தாமதிக்கவோ வேண்டாம். நீங்கள் எடுக்கும் ஒவ்வொரு மூலிகை, சப்ளிமெண்ட் பற்றியும் மருத்துவரிடம் சொல்லுங்கள்.",
      "किसी जड़ी-बूटी के लिए डॉक्टर की दी हुई हेपेटाइटिस या लिवर की दवाएँ कभी बंद न करें या टालें नहीं। आप जो भी जड़ी-बूटी या सप्लीमेंट लेते हैं, डॉक्टर को बताएँ।",
    ),
    safety: L(
      "Jaundice can come from hepatitis, gallstones, blood disorders or other serious causes, and needs tests. Some herbal products are contaminated or can themselves harm the liver. Avoid keezhanelli in pregnancy.",
      "மஞ்சள் காமாலை ஹெபடைடிஸ், பித்தப்பைக் கல், இரத்தக் கோளாறுகள் அல்லது பிற தீவிரக் காரணங்களால் வரலாம்; பரிசோதனைகள் தேவை. சில மூலிகைப் பொருட்கள் கலப்படமானவை அல்லது தாமே கல்லீரலைப் பாதிக்கக்கூடியவை. கர்ப்ப காலத்தில் கீழாநெல்லியைத் தவிருங்கள்.",
      "पीलिया हेपेटाइटिस, पित्ताशय की पथरी, ख़ून की बीमारियों या दूसरे गंभीर कारणों से हो सकता है, और इसके लिए जाँच ज़रूरी है। कुछ हर्बल उत्पाद मिलावटी होते हैं या ख़ुद लिवर को नुक़सान पहुँचा सकते हैं। गर्भावस्था में भूमि आंवला न लें।",
    ),
    more: L(
      "Traditional use: Siddha practitioners use keezhanelli for 'manjal kamalai' (jaundice). Scientific evidence: reviews of hepatitis B studies found the trials small and of low quality, with no reliable proof that it clears the virus. Modern antiviral medicines and hepatitis B vaccination are proven to work.",
      "பாரம்பரியப் பயன்பாடு: சித்த மருத்துவர்கள் மஞ்சள் காமாலைக்கு கீழாநெல்லியைப் பயன்படுத்துகின்றனர். அறிவியல் சான்று: ஹெபடைடிஸ் B ஆய்வுகளின் மதிப்பாய்வுகள் அவை சிறியவை, தரம் குறைந்தவை என்றும், வைரஸை நீக்குவதற்கு நம்பகமான சான்று இல்லை என்றும் கண்டன. நவீன வைரஸ் எதிர்ப்பு மருந்துகளும் ஹெபடைடிஸ் B தடுப்பூசியும் பயன்தருவது நிரூபிக்கப்பட்டது.",
      "पारंपरिक उपयोग: सिद्ध चिकित्सक पीलिया में भूमि आंवला इस्तेमाल करते हैं। वैज्ञानिक प्रमाण: हेपेटाइटिस B अध्ययनों की समीक्षाओं में परीक्षण छोटे और कम गुणवत्ता के पाए गए, और वायरस मिटाने का कोई भरोसेमंद प्रमाण नहीं मिला। आधुनिक एंटीवायरल दवाएँ और हेपेटाइटिस B का टीका असरदार साबित हैं।",
    ),
  },
  {
    id: "alcohol-detox",
    category: "liverKidney",
    evidence: "habit",
    keywords: ["alcohol", "detox", "liver", "cleanse", "supplements"],
    title: L(
      "Avoid alcohol when advised, and skip 'detox' products",
      "அறிவுறுத்தப்பட்டால் மதுவைத் தவிருங்கள்; 'டீடாக்ஸ்' பொருட்களைத் தவிருங்கள்",
      "सलाह मिलने पर शराब से दूर रहें, और 'डिटॉक्स' उत्पादों से बचें",
    ),
    summary: L(
      "Alcohol damages the liver, and people with liver disease are usually advised to stop completely. The liver and kidneys clean the blood themselves; 'detox' products are not needed.",
      "மது கல்லீரலைப் பாதிக்கும்; கல்லீரல் நோய் உள்ளவர்கள் பொதுவாக முற்றிலும் நிறுத்த அறிவுறுத்தப்படுவர். கல்லீரலும் சிறுநீரகங்களும் தாமாகவே இரத்தத்தைச் சுத்திகரிக்கின்றன; 'டீடாக்ஸ்' பொருட்கள் தேவையில்லை.",
      "शराब लिवर को नुक़सान पहुँचाती है, और लिवर रोग वाले लोगों को आमतौर पर पूरी तरह छोड़ने की सलाह दी जाती है। लिवर और किडनी ख़ुद ख़ून साफ़ करते हैं; 'डिटॉक्स' उत्पादों की ज़रूरत नहीं।",
    ),
    suggestion: L(
      "No alcohol if you have liver disease or hepatitis, or if your doctor advises it; water and a balanced diet instead of detox teas or cleanses.",
      "கல்லீரல் நோய், ஹெபடைடிஸ் இருந்தால் அல்லது மருத்துவர் அறிவுறுத்தினால் மது வேண்டாம்; டீடாக்ஸ் டீ அல்லது 'கிளென்ஸ்' பதிலாக தண்ணீரும் சமச்சீர் உணவும்.",
      "लिवर रोग या हेपेटाइटिस हो, या डॉक्टर कहें, तो शराब बिल्कुल नहीं; डिटॉक्स चाय या 'क्लींज़' की जगह पानी और संतुलित आहार।",
    ),
    howTo: L(
      "If stopping alcohol is hard, ask your doctor for support — stopping suddenly after heavy daily drinking can be dangerous and may need medical help.",
      "மதுவை நிறுத்துவது கடினமாக இருந்தால், மருத்துவரிடம் உதவி கேளுங்கள் — தினமும் அதிகமாகக் குடித்த பிறகு திடீரென நிறுத்துவது ஆபத்தானதாக இருக்கலாம், மருத்துவ உதவி தேவைப்படலாம்.",
      "शराब छोड़ना मुश्किल हो तो डॉक्टर से मदद माँगें — रोज़ ज़्यादा पीने के बाद अचानक छोड़ना ख़तरनाक हो सकता है और इसमें डॉक्टरी मदद चाहिए हो सकती है।",
    ),
    safety: L(
      "Unverified detox powders, teas and herbal mixtures can contain steroids, heavy metals or other substances that harm the liver and kidneys. Do not take them in place of treatment.",
      "சரிபார்க்கப்படாத டீடாக்ஸ் பொடிகள், டீ, மூலிகைக் கலவைகளில் ஸ்டீராய்டுகள், கன உலோகங்கள் அல்லது கல்லீரலையும் சிறுநீரகத்தையும் பாதிக்கும் பிற பொருட்கள் இருக்கலாம். சிகிச்சைக்குப் பதிலாக அவற்றை எடுக்காதீர்கள்.",
      "बिना जाँचे डिटॉक्स पाउडर, चाय और हर्बल मिश्रणों में स्टेरॉयड, भारी धातुएँ या लिवर और किडनी को नुक़सान पहुँचाने वाले दूसरे पदार्थ हो सकते हैं। इलाज की जगह इन्हें न लें।",
    ),
    more: L(
      "Get prompt medical assessment for yellow eyes or skin, vomiting blood, black stools, confusion, a swollen abdomen, severe abdominal pain, blood in the urine, or reduced urine output.",
      "கண்கள் அல்லது தோல் மஞ்சளாதல், இரத்த வாந்தி, கருப்பு மலம், குழப்பம், வயிறு வீக்கம், கடும் வயிற்று வலி, சிறுநீரில் இரத்தம், அல்லது சிறுநீர் அளவு குறைதல் இருந்தால் உடனடியாக மருத்துவப் பரிசோதனை பெறுங்கள்.",
      "आँखों या त्वचा का पीला होना, ख़ून की उल्टी, काला मल, भ्रम, पेट में सूजन, पेट में तेज़ दर्द, पेशाब में ख़ून, या पेशाब कम होना — इनमें तुरंत डॉक्टरी जाँच कराएँ।",
    ),
  },
]

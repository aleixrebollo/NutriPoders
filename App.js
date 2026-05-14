import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Image,
  TextInput,
  Keyboard,
  Dimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { height, width } = Dimensions.get('window');

const COLORS = {
  A: '#00f2ff',
  F: '#ff00ff',
  C: '#00ff9d',
  R: '#ffffff',
  E: '#ff8800',
};

const fixSpeech = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace('b12', 'be dotze')
    .replace('omega 3', 'omega tres')
    .replace('vitamina a', 'vitamina a')
    .replace('vitamina c', 'vitamina ce')
    .replace('%', ' per cent');
};

const normalize = (txt) =>
  txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const FOOD_DATABASE = {
  // SECCIÓ A: CENTRADA NOMÉS EN VITAMINA A
  broquil: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['broccoli', 'bròquil'] },
  pastanaga: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['carrot', 'zanahoria', 'pastanagues'] },
  espinacs: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['espinacas', 'fulles verdes'] },
  enciam: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['lechuga', 'amanida', 'salad'] },
  tomaquet: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['tomàquet', 'tomate', 'tomato'] },
  pebrot: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['pimiento', 'pepper'] },
  carbassa: { v: 'la VITAMINA A', p: 'VISIÓ NOCTURNA', id: 'A', icon: 'eye', variants: ['calabaza', 'pumpkin'] },
  
  pollastre: { v: 'PROTEÏNA i VITAMINA B', p: 'SUPERFORÇA', id: 'F', icon: 'fitness', variants: ['chicken', 'pollo'] },
  carn: { v: 'VITAMINA B12 i FERRO', p: 'SUPERFORÇA', id: 'F', icon: 'fitness', variants: ['meat', 'carne', 'vedella'] },
  ou: { v: 'PROTEÏNA i VITAMINES', p: 'SUPERFORÇA', id: 'F', icon: 'fitness', variants: ['egg', 'huevo', 'ous'] },
  llenties: { v: 'FERRO i PROTEÏNA', p: 'SUPER-RESISTÈNCIA', id: 'F', icon: 'fitness', variants: ['lentejas', 'lentils'] },
  
  taronja: { v: 'la VITAMINA C', p: 'ESCUT DE DEFENSES', id: 'C', icon: 'shield-checkmark', variants: ['orange', 'naranja'] },
  kiwi: { v: 'la VITAMINA C', p: 'ESCUT DE DEFENSES', id: 'C', icon: 'shield-checkmark', variants: [] },
  maduixa: { v: 'la VITAMINA C', p: 'ESCUT DE DEFENSES', id: 'C', icon: 'shield-checkmark', variants: ['strawberry', 'fresa', 'maduixes'] },
  
  // SECCIÓ R: SUBSTITUÏT IOGURT PER FRUITS SECS (MÉS SA I COSTA MÉS)
  peix: { v: 'VITAMINA D i OMEGA 3', p: 'SUPER-REGENERACIÓ', id: 'R', icon: 'medkit', variants: ['fish', 'pescado', 'salmo'] },
  oli: { v: 'VITAMINA E', p: 'SUPER-REGENERACIÓ', id: 'R', icon: 'medkit', variants: ['aceite', 'oil', 'oliva'] },
  nous: { v: 'OMEGA 3 i MINERALS', p: 'REGENERACIÓ CEL·LULAR', id: 'R', icon: 'medkit', variants: ['fruits secs', 'ametlles', 'pistatxos', 'avellanes'] },
  
  arros: { v: 'VITAMINA B i ENERGIA', p: 'SUPER-MENT', id: 'E', icon: 'brain', variants: ['arròs', 'rice', 'arroz'] },
  pasta: { v: "HIDRATS D'ENERGIA", p: 'SUPER-MENT', id: 'E', icon: 'brain', variants: ['macarrons', 'fideus', 'espaguetis'] },
  poma: { v: 'FIBRA i VITAMINES', p: 'SUPER-MENT', id: 'E', icon: 'brain', variants: ['apple', 'pomes'] },
  platan: { v: 'POTASSI i ENERGIA', p: 'SUPER-MENT', id: 'E', icon: 'brain', variants: ['plàtan', 'banana', 'platano'] },
};

export default function App() {
  const [page, setPage] = useState('Home');
  const [userName, setUserName] = useState('');
  const [foodInput, setFoodInput] = useState('');
  const [infoExtra, setInfoExtra] = useState('Hola Cadet! Menja per carregar-te.');
  const [stats, setStats] = useState({ A: 0.5, F: 0.5, C: 0.5, R: 0.5, E: 0.5 });
  const [lastFood, setLastFood] = useState({ name: '', power: '', icon: 'flash', col: '#ffcc00' });

  const anims = {
    A: useRef(new Animated.Value(0.5)).current,
    F: useRef(new Animated.Value(0.5)).current,
    C: useRef(new Animated.Value(0.5)).current,
    R: useRef(new Animated.Value(0.5)).current,
    E: useRef(new Animated.Value(0.5)).current,
  };

  const rewardAnim = useRef(new Animated.Value(0)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;
  const isProcessing = useRef(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const savedName = await AsyncStorage.getItem('@user_name');
      const savedStats = await AsyncStorage.getItem('@user_stats');
      if (savedName) setUserName(savedName);
      let currentStats = { A: 0.5, F: 0.5, C: 0.5, R: 0.5, E: 0.5 };
      if (savedStats) currentStats = JSON.parse(savedStats);
      setStats(currentStats);
      Object.keys(currentStats).forEach((key) => anims[key].setValue(currentStats[key]));
    } catch (e) { console.log(e); }
  };

  const saveName = async (name) => {
    setUserName(name);
    try { await AsyncStorage.setItem('@user_name', name); } catch (e) {}
  };

  const processSpeech = async (text) => {
    if (isProcessing.current || !text || text.length < 2) return;
    const t = normalize(text);
    const words = t.split(' ');
    let trobat = null;

    for (let clau in FOOD_DATABASE) {
      const normalizedKey = normalize(clau);
      const variants = (FOOD_DATABASE[clau].variants || []).map(normalize);
      const found = words.includes(normalizedKey) || 
                    variants.some((v) => words.includes(v)) ||
                    words.some((w) => w.startsWith(normalizedKey));
      if (found) {
        trobat = { name: clau, ...FOOD_DATABASE[clau] };
        break;
      }
    }

    if (!trobat) {
      setInfoExtra('Aliment no detectat. Torna-ho a provar!');
      return;
    }

    isProcessing.current = true;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const newVal = Math.min(stats[trobat.id] + 0.15, 1);
    const updatedStats = { ...stats, [trobat.id]: newVal };

    setLastFood({ name: trobat.name.toUpperCase(), power: trobat.p, icon: trobat.icon, col: COLORS[trobat.id] });
    setPage('Reward');
    shieldAnim.setValue(0);

    Animated.sequence([
      Animated.timing(shieldAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
      Animated.spring(shieldAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    Animated.spring(rewardAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    setTimeout(async () => {
      setStats(updatedStats);
      await AsyncStorage.setItem('@user_stats', JSON.stringify(updatedStats));
      setPage('Home');
      setFoodInput('');
      rewardAnim.setValue(0);
      
      const speechMsg = fixSpeech(`Molt bé! ${trobat.name} té ${trobat.v}`);
      Speech.speak(speechMsg, { language: 'ca-ES', rate: 0.9 });
      
      setInfoExtra(`⚡ ${trobat.p} carregada!`);
      Animated.timing(anims[trobat.id], { toValue: newVal, duration: 1000, useNativeDriver: false }).start();
      setTimeout(() => { isProcessing.current = false; }, 1500);
    }, 2000);
  };

  const StatBar = ({ label, vitamines, exemples, id, col }) => (
    <TouchableOpacity 
      onPress={() => Speech.speak(fixSpeech(`Menja ${exemples} per tenir ${label}.`), { language: 'ca-ES', rate: 0.9 })} 
      style={styles.barTouchArea}
    >
      <View style={styles.barHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barTitle, { color: col }]}>{label}</Text>
          <Text style={styles.barSub}>{vitamines} • <Text style={styles.barExamples}>{exemples}</Text></Text>
        </View>
        <Text style={styles.percent}>{Math.round(stats[id] * 100)}%</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { backgroundColor: col, width: anims[id].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3DarkTheme}>
        <SafeAreaView style={styles.container}>
          {page === 'Home' ? (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <TextInput style={styles.nameInput} placeholder="ESCRIU EL TEU NOM" placeholderTextColor="#1a1a1a" value={userName} onChangeText={saveName} autoCapitalize="characters" />
              <View style={styles.avatarArea}>
                <Animated.View style={[styles.energyField, { borderColor: lastFood.col, transform: [{ scale: shieldAnim }], opacity: shieldAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }]} />
                <Image source={require('./assets/ryder.png')} style={styles.ryderImg} />
              </View>
              <View style={styles.statsCard}>
                <StatBar id="A" label="VISIÓ NOCTURNA" vitamines="Vitamina A" exemples="Pastanaga, Bròquil" col={COLORS.A} />
                <StatBar id="F" label="SUPERFORÇA" vitamines="Proteïna, B12" exemples="Pollastre, Ou" col={COLORS.F} />
                <StatBar id="C" label="ESCUT DE DEFENSES" vitamines="Vitamina C" exemples="Taronja, Kiwi" col={COLORS.C} />
                <StatBar id="R" label="SUPER-REGENERACIÓ" vitamines="Omega 3, D, E" exemples="Peix, Nous" col={COLORS.R} />
                <StatBar id="E" label="ENERGIA MENTAL" vitamines="Hidrats, B" exemples="Arròs, Pasta" col={COLORS.E} />
              </View>
              <View style={styles.bubble}><Text style={styles.bubbleText}>{infoExtra}</Text></View>
              <TouchableOpacity style={styles.mainBtn} onPress={() => setPage('Listen')}>
                <Ionicons name="mic" size={24} color="white" />
                <Text style={styles.mainBtnText}>REGISTRAR ALIMENT</Text>
              </TouchableOpacity>
            </View>
          ) : page === 'Listen' ? (
            <View style={styles.fullCenter}>
              <Ionicons name="mic-circle" size={120} color="#ff8800" />
              <TextInput autoFocus value={foodInput} onChangeText={setFoodInput} onSubmitEditing={(e) => processSpeech(e.nativeEvent.text)} style={styles.inputMic} placeholder="Què has menjat?" />
              <TouchableOpacity style={styles.confirmBtn} onPress={() => processSpeech(foodInput)}><Text style={styles.confirmText}>CONFIRMAR</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setPage('Home')} style={{ marginTop: 30 }}><Text style={{ color: '#fff' }}>TORNAR</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fullCenter}>
              <Animated.View style={{ transform: [{ scale: rewardAnim }], alignItems: 'center' }}>
                <Ionicons name={lastFood.icon} size={130} color={lastFood.col} />
                <Text style={styles.rewardTitle}>{lastFood.name}</Text>
                <Text style={[styles.rewardSub, { color: lastFood.col }]}>⚡ {lastFood.power}</Text>
              </Animated.View>
            </View>
          )}
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000814' },
  nameInput: { fontSize: 26, color: '#00f2ff', fontWeight: 'bold', borderBottomWidth: 2, borderBottomColor: '#00f2ff', minWidth: '70%', textAlign: 'center', marginTop: 10 },
  avatarArea: { height: height * 0.38, width: width, justifyContent: 'center', alignItems: 'center' },
  energyField: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 8 },
  ryderImg: { height: '100%', width: '100%', resizeMode: 'contain' },
  statsCard: { width: '94%', backgroundColor: '#011627', padding: 12, borderRadius: 20 },
  barTouchArea: { marginBottom: 10 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTitle: { fontSize: 10, fontWeight: 'bold' },
  barSub: { color: '#aaa', fontSize: 9 },
  barExamples: { fontStyle: 'italic', color: '#777' },
  percent: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  barBg: { height: 9, backgroundColor: '#0a192f', borderRadius: 4.5, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4.5 },
  bubble: { backgroundColor: '#011627', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: '#00f2ff', width: '90%', marginTop: 10 },
  bubbleText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  mainBtn: { backgroundColor: '#ff8800', borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 14, marginTop: 10 },
  mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  inputMic: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 15, fontSize: 18, marginTop: 20 },
  confirmBtn: { backgroundColor: '#ff8800', marginTop: 20, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 20 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  rewardTitle: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 20 },
  rewardSub: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
});
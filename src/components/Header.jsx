import { Edit3, Play } from 'lucide-react-native';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Header({ mode, setMode, setActiveTool }) {
  const isMobile = Platform.OS !== 'web';

  return (
    <View style={[styles.header, isMobile && styles.mobileHeader]}>
      <Text style={[styles.logo, isMobile && styles.mobileLogo]}>IdeaWeave</Text>
      <View style={[styles.actions, isMobile && styles.mobileActions]}>
        <TouchableOpacity 
          style={[styles.btn, isMobile && styles.mobileBtn, mode === 'edit' && styles.activeBtn]} 
          onPress={() => { setMode('edit'); setActiveTool('select'); }}
        >
          <Edit3 size={isMobile ? 18 : 16} color={mode === 'edit' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.btnText, isMobile && styles.mobileBtnText, mode === 'edit' && styles.activeText]}>设计</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, isMobile && styles.mobileBtn, mode === 'play' && styles.activeBtn]} 
          onPress={() => setMode('play')}
        >
          <Play size={isMobile ? 18 : 16} color={mode === 'play' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.btnText, isMobile && styles.mobileBtnText, mode === 'play' && styles.activeText]}>预览</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    height: 50, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20 
  },
  mobileHeader: { 
    height: 56, 
    paddingHorizontal: 16 
  },
  logo: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#2563eb' 
  },
  mobileLogo: { 
    fontSize: 20 
  },
  actions: { 
    flexDirection: 'row', 
    gap: 10 
  },
  mobileActions: { 
    gap: 12 
  },
  btn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 6, 
    borderRadius: 6, 
    gap: 4 
  },
  mobileBtn: { 
    padding: 8, 
    borderRadius: 8, 
    gap: 6 
  },
  activeBtn: { 
    backgroundColor: '#eff6ff' 
  },
  btnText: { 
    fontSize: 14, 
    color: '#64748b' 
  },
  mobileBtnText: { 
    fontSize: 15 
  },
  activeText: { 
    color: '#3b82f6', 
    fontWeight: 'bold' 
  }
});

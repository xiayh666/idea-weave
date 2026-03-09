import { Eraser, Hand, MousePointer2, Pencil, Plus } from 'lucide-react-native';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

export const Toolbar = ({ activeTool, setActiveTool, onAddObject, mode }) => {
  const isMobile = Platform.OS !== 'web';

  if (mode === 'play') return null;

  const tools = [
    { id: 'select', icon: MousePointer2, label: '选择' },
    { id: 'pan', icon: Hand, label: '拖拽' },
    { id: 'draw', icon: Pencil, label: '画笔' },
    { id: 'erase', icon: Eraser, label: '橡皮' },
  ];

  return (
    <View style={[styles.toolbarContainer, isMobile && styles.mobileToolbarContainer]}>
      {tools.map(t => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        
        return (
          <TouchableOpacity 
            key={t.id} 
            onPress={() => setActiveTool(t.id)} 
            activeOpacity={0.7}
            style={[
              styles.toolButton, 
              isMobile && styles.mobileToolButton,
              isActive ? styles.activeButton : styles.inactiveButton
            ]}
          >
            <Icon size={isMobile ? 22 : 20} color={isActive ? '#3b82f6' : '#64748b'} />
          </TouchableOpacity>
        );
      })}
      
      <View style={[styles.divider, isMobile && styles.mobileDivider]} />
      
      <TouchableOpacity 
        onPress={onAddObject} 
        activeOpacity={0.7}
        style={[styles.addButton, isMobile && styles.mobileAddButton]}
      >
        <Plus size={isMobile ? 22 : 20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 4,
  },
  mobileToolbarContainer: {
    padding: 6,
    gap: 6,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileToolButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  activeButton: {
    backgroundColor: '#dbeafe',
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  mobileDivider: {
    height: 28,
    marginHorizontal: 6,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAddButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
});

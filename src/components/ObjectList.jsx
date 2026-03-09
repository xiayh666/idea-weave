import { Type } from "lucide-react-native";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export const ObjectList = ({ objects, selectedId, handleSelect, mode }) => {
  const isMobile = Platform.OS !== 'web';

  return (
    <View style={[styles.sidebar, isMobile && styles.mobileSidebar]}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={isMobile && styles.mobileScrollContent}>
        
        <Text style={[styles.headerText, isMobile && styles.mobileHeaderText]}>Objects / 对象列表</Text>

        <View style={styles.listContainer}>
          {objects.map(obj => {
            const isSelected = selectedId === obj.id && mode === 'edit';
            
            return (
              <TouchableOpacity
                key={obj.id}
                onPress={() => handleSelect(obj.id)}
                disabled={mode !== 'edit'}
                style={[
                  styles.listItem,
                  isMobile && styles.mobileListItem,
                  isSelected ? styles.itemSelected : styles.itemDefault,
                  { opacity: mode === 'edit' ? 1 : 0.6 }
                ]}
              >
                {obj.type === 'rect' ? (
                  <View style={[styles.shapeIcon, styles.rectIcon, { backgroundColor: obj.fillColor }]} />
                ) : obj.type === 'circle' ? (
                  <View style={[styles.shapeIcon, styles.circleIcon, { backgroundColor: obj.fillColor }]} />
                ) : (
                  <Type size={isMobile ? 16 : 14} color={isSelected ? '#1d4ed8' : '#475569'} />
                )}

                <Text style={[
                  styles.itemLabel,
                  isMobile && styles.mobileItemLabel,
                  { color: isSelected ? '#1d4ed8' : '#475569' }
                ]}>
                  {obj.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  mobileSidebar: {
    width: '100%',
    borderRightWidth: 0,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  mobileScrollContent: {
    paddingBottom: 20,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileHeaderText: {
    fontSize: 14,
    marginBottom: 16,
  },
  listContainer: {
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 8,
  },
  mobileListItem: {
    padding: 12,
    marginBottom: 4,
  },
  itemDefault: {
    backgroundColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: '#dbeafe',
  },
  shapeIcon: {
    width: 16,
    height: 16,
  },
  rectIcon: {
    borderRadius: 2,
  },
  circleIcon: {
    borderRadius: 8,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  mobileItemLabel: {
    fontSize: 15,
  },
});

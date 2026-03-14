
import { Layout, Palette, Play, Trash2, Zap } from "lucide-react-native";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export const PropertyPanel = ({ selectedObj, selectedId, updateObject, mode, onDelete }) => {
  const isMobile = Platform.OS !== 'web';

  if (!selectedObj || mode !== 'edit') {
    return (
      <View style={[styles.panel, isMobile && styles.mobilePanel]}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            {mode === 'play' ? <Play size={isMobile ? 48 : 40} color="#3b82f6" /> : <Layout size={isMobile ? 48 : 40} color="#94a3b8" />}
          </View>
          <Text style={[styles.emptyTitle, isMobile && styles.mobileEmptyTitle]}>
            {mode === 'play' ? '交互预览已开启' : '未选择任何对象'}
          </Text>
          <Text style={[styles.emptySubTitle, isMobile && styles.mobileEmptySubTitle]}>
            {mode === 'play' ? '点击画布中的物体触发你定义的交互逻辑' : '请在画布或左侧列表中选择对象进行编辑'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.panel, isMobile && styles.mobilePanel]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={isMobile && styles.mobileScrollContent}>
        <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>外观属性</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Layout size={isMobile ? 14 : 10} color="#94a3b8" />
            <Text style={[styles.sectionHeaderText, isMobile && styles.mobileSectionHeaderText]}>布局 / Layout</Text>
          </View>
          <View style={[styles.gridRow, isMobile && styles.mobileGridRow]}>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>宽度 W</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(selectedObj.width) || 0)}
                onChangeText={(val) => updateObject(selectedId, { width: Number(val) })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>高度 H</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(selectedObj.height) || 0)}
                onChangeText={(val) => updateObject(selectedId, { height: Number(val) })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
          <View style={[styles.gridRow, isMobile && styles.mobileGridRow]}>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>X 坐标</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(selectedObj.x) || 0)}
                onChangeText={(val) => updateObject(selectedId, { x: Number(val) })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>Y 坐标</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(selectedObj.y) || 0)}
                onChangeText={(val) => updateObject(selectedId, { y: Number(val) })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={isMobile ? 14 : 10} color="#94a3b8" />
            <Text style={[styles.sectionHeaderText, isMobile && styles.mobileSectionHeaderText]}>外观 / Appearance</Text>
          </View>
          <View style={[styles.gridRow, isMobile && styles.mobileGridRow]}>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>填充颜色</Text>
              <View style={[styles.colorInputContainer, isMobile && styles.mobileColorInputContainer]}>
                <View style={[styles.colorPreview, { backgroundColor: selectedObj.fillColor }]} />
                <TextInput
                  value={selectedObj.fillColor}
                  onChangeText={(val) => updateObject(selectedId, { fillColor: val })}
                  style={[styles.colorInput, isMobile && styles.mobileColorInput]}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>圆角半径</Text>
              <TextInput
                keyboardType="numeric"
                value={String(selectedObj.borderRadius || 0)}
                onChangeText={(val) => updateObject(selectedId, { borderRadius: Number(val) })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
          {selectedObj.type === 'text' && (
            <View style={[styles.gridItem, isMobile && styles.mobileGridItem, { marginTop: 8 }]}>
              <Text style={[styles.labelSmall, isMobile && styles.mobileLabelSmall]}>文本内容</Text>
              <TextInput
                value={selectedObj.text || ''}
                onChangeText={(val) => updateObject(selectedId, { text: val })}
                style={[styles.input, isMobile && styles.mobileInput]}
                placeholderTextColor="#94a3b8"
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={isMobile ? 14 : 10} color="#94a3b8" />
            <Text style={[styles.sectionHeaderText, isMobile && styles.mobileSectionHeaderText]}>交互 / Interactions</Text>
          </View>
          {(selectedObj.behaviors || []).length === 0 ? (
            <Text style={[styles.emptyText, isMobile && styles.mobileEmptyText]}>暂无交互行为</Text>
          ) : (
            selectedObj.behaviors.map(bh => (
              <View key={bh.id} style={[styles.behaviorItem, isMobile && styles.mobileBehaviorItem]}>
                <Text style={[styles.behaviorText, isMobile && styles.mobileBehaviorText]}>{bh.name}</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          onPress={() => onDelete(selectedId)}
          style={[styles.deleteButton, isMobile && styles.mobileDeleteButton]}
        >
          <Trash2 size={isMobile ? 18 : 14} color="#dc2626" />
          <Text style={[styles.deleteButtonText, isMobile && styles.mobileDeleteButtonText]}>删除对象</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    width: 260,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  mobilePanel: {
    width: '100%',
    borderLeftWidth: 0,
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  mobileScrollContent: {
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  mobileMainTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileSectionHeaderText: {
    fontSize: 13,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileGridRow: {
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  mobileGridItem: {
    marginBottom: 4,
  },
  labelSmall: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  mobileLabelSmall: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    height: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  mobileInput: {
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    borderRadius: 8,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
  },
  mobileColorInputContainer: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  mobileColorInput: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  mobileEmptyText: {
    fontSize: 14,
  },
  behaviorItem: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  mobileBehaviorItem: {
    padding: 12,
    marginBottom: 6,
    borderRadius: 8,
  },
  behaviorText: {
    fontSize: 12,
    color: '#166534',
  },
  mobileBehaviorText: {
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    paddingVertical: 10,
    gap: 6,
    marginTop: 8,
  },
  mobileDeleteButton: {
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  mobileDeleteButtonText: {
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  mobileEmptyTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubTitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  mobileEmptySubTitle: {
    fontSize: 14,
  },
});
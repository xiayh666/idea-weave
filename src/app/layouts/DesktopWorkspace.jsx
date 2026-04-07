import { Trash2 } from 'lucide-react-native';
import { TouchableOpacity, View, Text, Platform } from 'react-native';
import { ObjectList } from '../../components/ObjectList';
import { PropertyPanel } from '../../components/PropertyPanel';
import { Toolbar } from '../../components/Toolbar';
import { CanvasRenderer } from '../../hooks/useCanvas';
import { styles } from '../index_style';

export function DesktopWorkspace({
  objects,
  selectedId,
  selectedObj,
  mode,
  activeTool,
  setActiveTool,
  handleAddCustomObject,
  handleClearCanvas,
  handleSelect,
  updateObject,
  deleteObject,
  handleAddBehavior,
  canvasRef,
  triggerBehavior,
  setSelectedId
}) {
  return (
    <View style={styles.mainContent}>
      <View style={styles.leftSidebar}>
        <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
      </View>

      <View style={styles.centerArea}>
        <View style={styles.canvasContainer}>
          <View style={styles.toolbarWrapper}>
            <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
            {mode === 'edit' && (
              <TouchableOpacity onPress={handleClearCanvas} style={styles.clearButton}>
                <Trash2 size={14} color="#dc2626" />
                <Text style={styles.clearButtonText}>Clear Canvas</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.canvasWrapper}>
            {Platform.OS === 'web' && <View style={styles.webGrid} />}
            <CanvasRenderer
              objects={objects}
              mode={mode}
              canvasRef={canvasRef}
              onSelect={setSelectedId}
              onModify={updateObject}
              onDelete={deleteObject}
              onTrigger={triggerBehavior}
            />
          </View>
          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
            <Text style={styles.statusText}>
              {mode === 'play' ? 'INTERACTIVE PREVIEW' : 'DESIGN MODE'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSidebar}>
        <PropertyPanel
          selectedObj={selectedObj}
          selectedId={selectedId}
          updateObject={updateObject}
          onDelete={deleteObject}
          mode={mode}
          onAddBehavior={handleAddBehavior}
        />
      </View>
    </View>
  );
}

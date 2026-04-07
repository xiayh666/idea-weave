import { Trash2 } from 'lucide-react-native';
import { TouchableOpacity, View, Text } from 'react-native';
import { ObjectList } from '../../components/ObjectList';
import { PropertyPanel } from '../../components/PropertyPanel';
import { Toolbar } from '../../components/Toolbar';
import { CanvasRenderer } from '../../hooks/useCanvas';
import { styles } from '../index_style';

export function MobileWorkspace({
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
  activeTab,
  setActiveTab,
  setSelectedId
}) {
  return (
    <>
      <View style={styles.mobileTabBar}>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'objects' && styles.mobileTabActive]}
          onPress={() => setActiveTab('objects')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'objects' && styles.mobileTabTextActive]}>Objects</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'canvas' && styles.mobileTabActive]}
          onPress={() => setActiveTab('canvas')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'canvas' && styles.mobileTabTextActive]}>Canvas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'properties' && styles.mobileTabActive]}
          onPress={() => setActiveTab('properties')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'properties' && styles.mobileTabTextActive]}>Properties</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mobileContent}>
        {activeTab === 'objects' && (
          <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
        )}

        {activeTab === 'canvas' && (
          <View style={styles.mobileCanvasContainer}>
            <View style={styles.mobileToolbarWrapper}>
              <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
              {mode === 'edit' && (
                <TouchableOpacity onPress={handleClearCanvas} style={styles.mobileClearButton}>
                  <Trash2 size={16} color="#dc2626" />
                  <Text style={styles.mobileClearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.mobileCanvasWrapper}>
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

            <View style={styles.mobileStatusBar}>
              <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
              <Text style={styles.statusText}>
                {mode === 'play' ? 'Play Mode' : 'Edit Mode'}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'properties' && (
          <PropertyPanel
            selectedObj={selectedObj}
            selectedId={selectedId}
            updateObject={updateObject}
            onDelete={deleteObject}
            mode={mode}
            onAddBehavior={handleAddBehavior}
          />
        )}
      </View>
    </>
  );
}

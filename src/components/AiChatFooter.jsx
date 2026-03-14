import { Send, Sparkles } from "lucide-react-native";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export const AiChatFooter = ({ input, setInput, handleAICommand }) => {
  const isMobile = Platform.OS !== 'web';

  const handleKeyDown = (e) => {
    if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAICommand(input);
    }
  };

  return (
    <View style={[styles.footer, isMobile && styles.mobileFooter]}>
      {isMobile ? (
        <View style={styles.mobileContentContainer}>
          <View style={styles.mobileLeftSection}>
            <View style={styles.mobileTagContainer}>
              {['# 旋转正方形', '# 放大圆形', '# 移动方块'].map(tag => (
                <TouchableOpacity 
                  key={tag} 
                  onPress={() => setInput(tag.replace('# ', ''))}
                  style={styles.mobileTagButton}
                >
                  <Text style={styles.mobileTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.mobileLogoContainer}>
              <Sparkles size={20} color="#2563eb" fill="#2563eb" />
              <Text style={styles.mobileLogoText}>IdeaWeave Agent</Text>
            </View>
          </View>

          <View style={styles.mobileInputSection}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onKeyPress={handleKeyDown}
              placeholder="描述你想要的物体及其行为..."
              multiline={true}
              style={styles.mobileTextArea}
              placeholderTextColor="#94a3b8"
            />
            
            <TouchableOpacity 
              onPress={() => handleAICommand(input)}
              style={styles.mobileSendButton}
            >
              <Send size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.webContentContainer}>
          <View style={styles.webInputSection}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onKeyPress={handleKeyDown}
              placeholder="描述你想要的物体及其行为..."
              multiline={true}
              style={styles.webTextArea}
              placeholderTextColor="#94a3b8"
            />
            
            <TouchableOpacity 
              onPress={() => handleAICommand(input)}
              style={styles.webSendButton}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.webTagContainer}>
            {['# 旋转正方形', '# 放大圆形', '# 移动方块'].map(tag => (
              <TouchableOpacity 
                key={tag} 
                onPress={() => setInput(tag.replace('# ', ''))}
                style={styles.webTagButton}
              >
                <Text style={styles.webTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.webLogoContainer}>
            <Sparkles size={18} color="#2563eb" fill="#2563eb" />
            <Text style={styles.webLogoText}>IdeaWeave Agent</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  mobileFooter: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fafafa',
  },
  
  // Web端居中布局
  webContentContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  webInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 600,
  },
  webTextArea: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    textAlignVertical: 'center',
  },
  webSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webTagContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  webTagButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  webTagText: {
    fontSize: 12,
    color: '#64748b',
  },
  webLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webLogoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  
  // Mobile styles
  mobileContentContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  mobileLeftSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    alignItems: 'flex-start',
  },
  mobileTagContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  mobileTagButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
  },
  mobileTagText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
  mobileLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  mobileLogoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  mobileInputSection: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: '100%',
    gap: 10,
    alignItems: 'center',
  },
  mobileTextArea: {
    height: 48,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 24,
    backgroundColor: 'white',
  },
  mobileSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
  },
});

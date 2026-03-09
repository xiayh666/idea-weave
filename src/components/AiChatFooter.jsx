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
      <View style={[styles.contentContainer, isMobile && styles.mobileContentContainer]}>
        
        <View style={[styles.leftSection, isMobile && styles.mobileLeftSection]}>
          <View style={[styles.tagContainer, isMobile && styles.mobileTagContainer]}>
            {['# 旋转正方形', '# 放大圆形', '# 移动方块'].map(tag => (
              <TouchableOpacity 
                key={tag} 
                onPress={() => setInput(tag.replace('# ', ''))}
                style={[styles.tagButton, isMobile && styles.mobileTagButton]}
              >
                <Text style={[styles.tagText, isMobile && styles.mobileTagText]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={[styles.logoContainer, isMobile && styles.mobileLogoContainer]}>
            <Sparkles size={isMobile ? 20 : 18} color="#2563eb" fill="#2563eb" />
            <Text style={[styles.logoText, isMobile && styles.mobileLogoText]}>IdeaWeave Agent</Text>
          </View>
        </View>

        <View style={[styles.inputSection, isMobile && styles.mobileInputSection]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onKeyPress={handleKeyDown}
            placeholder="描述你想要的物体及其行为..."
            multiline={true}
            style={[styles.textArea, isMobile && styles.mobileTextArea]}
            placeholderTextColor="#94a3b8"
          />
          
          <TouchableOpacity 
            onPress={() => handleAICommand(input)}
            style={[styles.sendButton, isMobile && styles.mobileSendButton]}
          >
            <Send size={isMobile ? 20 : 18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  mobileContentContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mobileLeftSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileTagContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  tagButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  mobileTagButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
  },
  mobileTagText: {
    fontSize: 11,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  mobileLogoText: {
    fontSize: 12,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: 400,
  },
  mobileInputSection: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: '100%',
    gap: 8,
  },
  textArea: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    textAlignVertical: 'center',
  },
  mobileTextArea: {
    height: 44,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});

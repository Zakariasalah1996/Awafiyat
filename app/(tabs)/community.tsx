import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import { CommunityComment, CommunityPost, deleteCommunityPost, getCommunityCurrentUserId, getCommunityPosts, getPostComments, publishCommunityPost, publishPostComment, reportCommunityComment, reportCommunityPost, togglePostLike, updateCommunityPost } from "@/lib/community-api";
import { markCommunityAsRead } from "@/lib/community-unread";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "الآن";
  }
}

export default function CommunityScreen() {
  const colors = useColors();
  const { profile } = useUser();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setPosts(await getCommunityPosts());
      await markCommunityAsRead();
    } catch (error) {
      Alert.alert("تعذر التحميل", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => { getCommunityCurrentUserId().then(setCurrentUserId).catch(() => undefined); }, []);

  const requireName = () => {
    if (profile.name.trim().length >= 2) return true;
    Alert.alert("الاسم مطلوب", "أضف اسماً ظاهراً ثابتاً من صفحة حسابي قبل النشر أو التعليق.", [
      { text: "لاحقاً", style: "cancel" },
      { text: "فتح حسابي", onPress: () => router.navigate("/(tabs)/profile" as any) },
    ]);
    return false;
  };

  const selectImage = async (camera: boolean) => {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("الإذن مطلوب", "نحتاج إذن الكاميرا لالتقاط صورة الطبق.");
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.6 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const publish = async () => {
    const body = draft.trim();
    if (!body && !image) return Alert.alert("أضف محتوى", "اكتب منشوراً أو أضف صورة طعام.");
    if (!requireName()) return;
    try {
      setPublishing(true);
      const imageData = image
        ? await FileSystem.readAsStringAsync(image.uri, { encoding: FileSystem.EncodingType.Base64 })
        : undefined;
      const post = editingPostId
        ? await updateCommunityPost(editingPostId, body)
        : await publishCommunityPost({ body, imageData, contentType: image?.mimeType ?? "image/jpeg" });
      setPosts((current) => editingPostId ? current.map((item) => item.id === post.id ? { ...item, ...post } : item) : [post, ...current]);
      setDraft("");
      setImage(null);
      setEditingPostId(null);
    } catch (error) {
      Alert.alert("تعذر النشر", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setPublishing(false);
    }
  };

  const like = async (post: CommunityPost) => {
    try {
      const liked = await togglePostLike(post.id);
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likedByCurrentUser: liked, likeCount: item.likeCount + (liked ? 1 : -1) } : item));
      if (activePost?.id === post.id) setActivePost({ ...post, likedByCurrentUser: liked, likeCount: post.likeCount + (liked ? 1 : -1) });
    } catch (error) {
      Alert.alert("تعذر تسجيل الإعجاب", error instanceof Error ? error.message : "حاول مرة أخرى");
    }
  };

  const openComments = async (post: CommunityPost) => {
    setActivePost(post);
    setComments([]);
    try { setComments(await getPostComments(post.id)); } catch { Alert.alert("تعذر تحميل التعليقات", "حاول مرة أخرى"); }
  };

  const addComment = async () => {
    if (!activePost || !commentDraft.trim() || !requireName()) return;
    try {
      setCommenting(true);
      const comment = await publishPostComment(activePost.id, commentDraft.trim());
      setComments((current) => [...current, comment]);
      setPosts((current) => current.map((item) => item.id === activePost.id ? { ...item, commentCount: item.commentCount + 1 } : item));
      setCommentDraft("");
    } catch (error) {
      Alert.alert("تعذر إضافة التعليق", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally { setCommenting(false); }
  };

  const reportPost = (post: CommunityPost) => Alert.alert("الإبلاغ عن المنشور", "اختر السبب", [
    { text: "إلغاء", style: "cancel" },
    { text: "رسائل مزعجة", onPress: () => reportCommunityPost(post.id, "رسائل مزعجة").then(() => Alert.alert("تم الإبلاغ", "سيُراجع المنشور.")) },
    { text: "محتوى غير مناسب", onPress: () => reportCommunityPost(post.id, "محتوى غير مناسب").then(() => Alert.alert("تم الإبلاغ", "سيُراجع المنشور.")) },
  ]);

  const managePost = (post: CommunityPost) => {
    if (post.authorId !== currentUserId) return reportPost(post);
    Alert.alert("إدارة المنشور", undefined, [
      { text: "إلغاء", style: "cancel" },
      { text: "تعديل", onPress: () => { setEditingPostId(post.id); setDraft(post.body ?? ""); } },
      { text: "حذف", style: "destructive", onPress: () => Alert.alert("حذف المنشور؟", "لا يمكن التراجع عن الحذف.", [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => deleteCommunityPost(post.id).then(() => setPosts((items) => items.filter((item) => item.id !== post.id))).catch((error) => Alert.alert("تعذر الحذف", error.message)) }]) },
    ]);
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>{item.authorName.slice(0, 1)}</Text></View>
        <View style={styles.authorInfo}><Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text><Text style={[styles.date, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text></View>
        <TouchableOpacity onPress={() => managePost(item)} style={{ padding: 6 }}><MaterialIcons name="more-horiz" size={23} color={colors.muted} /></TouchableOpacity>
      </View>
      {!!item.body && <Text style={[styles.body, { color: colors.foreground }]}>{item.body}</Text>}
      {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={() => like(item)} style={styles.action}><MaterialIcons name={item.likedByCurrentUser ? "favorite" : "favorite-border"} size={21} color={item.likedByCurrentUser ? colors.error : colors.muted} /><Text style={[styles.actionText, { color: item.likedByCurrentUser ? colors.error : colors.muted }]}>{item.likeCount || ""} أعجبني</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => openComments(item)} style={styles.action}><MaterialIcons name="chat-bubble-outline" size={20} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{item.commentCount || ""} تعليق</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPosts} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View>
          <Text style={[styles.title, { color: colors.foreground }]}>مجتمع الطبخ</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>شارك أفكارك وتجاربك مع كل مستخدمي ألف عافيات</Text>
          <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="ماذا تريد أن تشارك اليوم؟" placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={[styles.input, { color: colors.foreground }]} maxLength={1200} />
            {!!image && <View><Image source={{ uri: image.uri }} style={styles.preview} /><Pressable onPress={() => setImage(null)} style={styles.removeImage}><MaterialIcons name="close" color="#fff" size={18} /></Pressable></View>}
            <View style={styles.composerFooter}>
              <View style={styles.mediaActions}><TouchableOpacity onPress={() => selectImage(false)} style={styles.iconButton}><MaterialIcons name="photo-library" size={22} color={colors.primary} /></TouchableOpacity><TouchableOpacity onPress={() => selectImage(true)} style={styles.iconButton}><MaterialIcons name="camera-alt" size={22} color={colors.primary} /></TouchableOpacity></View>
              <TouchableOpacity onPress={publish} disabled={publishing} style={[styles.publishButton, { backgroundColor: colors.primary, opacity: publishing ? 0.6 : 1 }]}><Text style={styles.publishText}>{publishing ? "جارٍ الحفظ..." : editingPostId ? "حفظ التعديل" : "نشر"}</Text></TouchableOpacity>
            </View>
            <Text style={[styles.note, { color: colors.muted }]}>النص حر. الصور تمر بفاحص يقبل الطعام والمشروبات فقط.</Text>
          </View>
          <Text style={[styles.feedLabel, { color: colors.foreground }]}>أحدث المنشورات</Text>
        </View>}
        ListEmptyComponent={!loading ? <View style={styles.empty}><MaterialIcons name="restaurant" size={42} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>كن أول من يشارك</Text><Text style={[styles.emptyText, { color: colors.muted }]}>اكتب فكرة طبخ أو شارك صورة طبقك.</Text></View> : null}
      />
      <Modal visible={!!activePost} animationType="slide" transparent onRequestClose={() => setActivePost(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><Text style={[styles.modalTitle, { color: colors.foreground }]}>التعليقات</Text><TouchableOpacity onPress={() => setActivePost(null)}><MaterialIcons name="close" size={25} color={colors.foreground} /></TouchableOpacity></View>
          <FlatList data={comments} keyExtractor={(comment) => String(comment.id)} contentContainerStyle={styles.comments} renderItem={({ item }) => <View style={[styles.comment, { backgroundColor: colors.surface }]}><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}><Text style={[styles.commentName, { color: colors.foreground }]}>{item.authorName}</Text><TouchableOpacity onPress={() => reportCommunityComment(item.id, "تعليق غير مناسب").then(() => Alert.alert("تم الإبلاغ", "سيُراجع التعليق."))}><MaterialIcons name="flag" size={17} color={colors.muted} /></TouchableOpacity></View><Text style={[styles.commentBody, { color: colors.foreground }]}>{item.body}</Text></View>} ListEmptyComponent={<Text style={[styles.noComments, { color: colors.muted }]}>لا توجد تعليقات بعد. اكتب أول تعليق.</Text>} />
          <View style={[styles.commentComposer, { borderTopColor: colors.border }]}><TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder="أضف تعليقاً..." placeholderTextColor={colors.muted} style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border }]} maxLength={500} /><TouchableOpacity onPress={addComment} disabled={commenting} style={[styles.sendButton, { backgroundColor: colors.primary }]}><MaterialIcons name="send" size={20} color="#fff" /></TouchableOpacity></View>
        </View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 36, gap: 12 }, title: { fontSize: 25, fontWeight: "800", textAlign: "right" }, subtitle: { fontSize: 13, textAlign: "right", marginTop: 3, marginBottom: 14 }, composer: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 18 }, input: { minHeight: 72, fontSize: 15, textAlign: "right" }, preview: { width: "100%", height: 190, borderRadius: 12, marginBottom: 10 }, removeImage: { position: "absolute", top: 7, right: 7, width: 28, height: 28, backgroundColor: "#0009", borderRadius: 14, alignItems: "center", justifyContent: "center" }, composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, mediaActions: { flexDirection: "row", gap: 5 }, iconButton: { padding: 8 }, publishButton: { paddingHorizontal: 23, paddingVertical: 10, borderRadius: 12 }, publishText: { color: "#fff", fontWeight: "800" }, note: { fontSize: 11, textAlign: "right", marginTop: 6 }, feedLabel: { fontSize: 17, fontWeight: "800", textAlign: "right", marginBottom: 8 }, card: { borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 12 }, authorRow: { flexDirection: "row-reverse", alignItems: "center" }, avatar: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 9 }, authorInfo: { flex: 1, alignItems: "flex-end" }, author: { fontSize: 14, fontWeight: "800" }, date: { fontSize: 11, marginTop: 1 }, body: { fontSize: 15, lineHeight: 23, textAlign: "right", marginVertical: 12 }, postImage: { width: "100%", height: 230, borderRadius: 14, marginBottom: 11 }, actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: "row-reverse", gap: 24 }, action: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, actionText: { fontSize: 13, fontWeight: "600" }, empty: { alignItems: "center", paddingTop: 42, gap: 8 }, emptyTitle: { fontWeight: "800", fontSize: 17 }, emptyText: { fontSize: 13 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0007" }, modal: { height: "76%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }, modalHeader: { height: 58, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, modalTitle: { fontWeight: "800", fontSize: 17 }, comments: { padding: 16, gap: 9 }, comment: { borderRadius: 13, padding: 11 }, commentName: { fontSize: 13, fontWeight: "800", textAlign: "right", marginBottom: 3 }, commentBody: { fontSize: 14, textAlign: "right" }, noComments: { textAlign: "center", marginTop: 40 }, commentComposer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", gap: 8 }, commentInput: { borderWidth: 1, borderRadius: 12, flex: 1, paddingHorizontal: 12, textAlign: "right" }, sendButton: { width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import { CommunityComment, CommunityPost, deleteCommunityPost, getCommunityCurrentUserId, getCommunityPosts, getPostComments, publishCommunityPost, publishPostComment, reportCommunityComment, reportCommunityPost, toggleCommentLike, togglePostLike, updateCommunityComment, updateCommunityPost } from "@/lib/community-api";
import { markCommunityAsRead } from "@/lib/community-unread";

type CommunityActionSheet =
  | { kind: "post"; post: CommunityPost }
  | { kind: "comment"; comment: CommunityComment }
  | null;

type CommunityReportTarget =
  | { kind: "post"; id: number }
  | { kind: "comment"; id: number }
  | null;

const REPORT_REASONS = [
  { value: "محتوى غير مناسب", icon: "warning-amber" as const },
  { value: "رسائل مزعجة أو ترويج", icon: "campaign" as const },
  { value: "إساءة أو تنمر", icon: "person-off" as const },
  { value: "معلومات مضللة", icon: "report-problem" as const },
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "الآن";
  }
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<number | null>(null);
  const [commentLikeBusyId, setCommentLikeBusyId] = useState<number | null>(null);
  const [actionSheet, setActionSheet] = useState<CommunityActionSheet>(null);
  const [reportTarget, setReportTarget] = useState<CommunityReportTarget>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);

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
      const message = error instanceof Error ? error.message : "حاول مرة أخرى";
      Alert.alert(message.includes("احذف منشورك السابق") ? "النشر محدود مؤقتاً" : "تعذر النشر", message);
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

  const startEditingComment = (comment: CommunityComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentDraft(comment.body);
    setActionSheet(null);
  };

  const saveCommentEdit = async () => {
    if (!editingCommentId || !editingCommentDraft.trim()) return;
    try {
      setSavingCommentId(editingCommentId);
      const updated = await updateCommunityComment(editingCommentId, editingCommentDraft.trim());
      setComments((current) => current.map((comment) => comment.id === updated.id ? { ...comment, ...updated } : comment));
      setEditingCommentId(null);
      setEditingCommentDraft("");
    } catch (error) {
      Alert.alert("تعذر تعديل التعليق", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setSavingCommentId(null);
    }
  };

  const likeComment = async (comment: CommunityComment) => {
    if (commentLikeBusyId === comment.id) return;
    try {
      setCommentLikeBusyId(comment.id);
      const liked = await toggleCommentLike(comment.id);
      setComments((current) => current.map((item) => item.id === comment.id ? {
        ...item,
        likedByCurrentUser: liked,
        likeCount: Math.max(0, item.likeCount + (liked ? 1 : -1)),
      } : item));
    } catch (error) {
      Alert.alert("تعذر تسجيل الإعجاب", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setCommentLikeBusyId(null);
    }
  };

  const openReport = (target: Exclude<CommunityReportTarget, null>) => {
    setActionSheet(null);
    setReportReason("");
    setReportTarget(target);
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    try {
      setReporting(true);
      if (reportTarget.kind === "post") await reportCommunityPost(reportTarget.id, reportReason);
      else await reportCommunityComment(reportTarget.id, reportReason);
      setReportTarget(null);
      setReportReason("");
      Alert.alert("تم إرسال البلاغ", "سيصل البلاغ إلى لوحة الإدارة للمراجعة.");
    } catch (error) {
      Alert.alert("تعذر إرسال البلاغ", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setReporting(false);
    }
  };

  const startEditingPost = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setDraft(post.body ?? "");
    setActionSheet(null);
  };

  const confirmDeletePost = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCommunityPost(deleteTarget.id);
      setPosts((items) => items.filter((item) => item.id !== deleteTarget.id));
      if (activePost?.id === deleteTarget.id) setActivePost(null);
      setDeleteTarget(null);
    } catch (error) {
      Alert.alert("تعذر الحذف", error instanceof Error ? error.message : "حاول مرة أخرى");
    }
  };

  const closeComments = () => {
    setActivePost(null);
    setEditingCommentId(null);
    setEditingCommentDraft("");
  };

  const renderComment = ({ item }: { item: CommunityComment }) => {
    const wasEdited = new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
    const isEditing = editingCommentId === item.id;
    return (
      <View style={[styles.comment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.commentHeader}>
          <View style={[styles.commentAvatar, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={{ color: colors.primary, fontWeight: "800" }}>{item.authorName.slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[styles.commentName, { color: colors.foreground }]}>{item.authorName}</Text>
            <Text style={[styles.commentDate, { color: colors.muted }]}>{formatDate(item.createdAt)}{wasEdited ? " • تم التعديل" : ""}</Text>
          </View>
          <TouchableOpacity onPress={() => setActionSheet({ kind: "comment", comment: item })} style={styles.moreButton}>
            <MaterialIcons name="more-horiz" size={21} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={{ marginTop: 10 }}>
            <TextInput
              value={editingCommentDraft}
              onChangeText={setEditingCommentDraft}
              multiline
              autoFocus
              maxLength={500}
              textAlignVertical="top"
              placeholder="اكتب تعليقك..."
              placeholderTextColor={colors.muted}
              style={[styles.editCommentInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.background }]}
            />
            <View style={styles.editCommentActions}>
              <TouchableOpacity
                onPress={saveCommentEdit}
                disabled={savingCommentId === item.id || !editingCommentDraft.trim()}
                style={[styles.smallPrimaryButton, { backgroundColor: colors.primary, opacity: !editingCommentDraft.trim() ? 0.45 : 1 }]}
              >
                <Text style={styles.smallPrimaryText}>{savingCommentId === item.id ? "جارٍ الحفظ..." : "حفظ"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingCommentId(null); setEditingCommentDraft(""); }} style={[styles.smallSecondaryButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontWeight: "700" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.commentBody, { color: colors.foreground }]}>{item.body}</Text>
        )}

        {!isEditing && (
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => likeComment(item)}
              disabled={commentLikeBusyId === item.id}
              style={styles.commentLikeButton}
            >
              <MaterialIcons name={item.likedByCurrentUser ? "favorite" : "favorite-border"} size={18} color={item.likedByCurrentUser ? colors.error : colors.muted} />
              <Text style={{ color: item.likedByCurrentUser ? colors.error : colors.muted, fontSize: 12, fontWeight: "700" }}>
                {item.likeCount > 0 ? item.likeCount : ""} أعجبني
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={{ color: colors.primary, fontWeight: "800" }}>{item.authorName.slice(0, 1)}</Text></View>
        <View style={styles.authorInfo}><Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text><Text style={[styles.date, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text></View>
        <TouchableOpacity onPress={() => setActionSheet({ kind: "post", post: item })} style={{ padding: 6 }}><MaterialIcons name="more-horiz" size={23} color={colors.muted} /></TouchableOpacity>
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
      <Modal visible={!!activePost} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={closeComments}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><View><Text style={[styles.modalTitle, { color: colors.foreground }]}>التعليقات</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: "right", marginTop: 2 }}>{comments.length} تعليق</Text></View><TouchableOpacity onPress={closeComments} style={[styles.closeButton, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity></View>
          <FlatList data={comments} keyExtractor={(comment) => String(comment.id)} contentContainerStyle={styles.comments} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} renderItem={renderComment} ListEmptyComponent={<Text style={[styles.noComments, { color: colors.muted }]}>لا توجد تعليقات بعد. اكتب أول تعليق.</Text>} />
          <View style={[styles.commentComposer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}><TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder="أضف تعليقاً..." placeholderTextColor={colors.muted} style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border }]} maxLength={500} returnKeyType="send" onSubmitEditing={addComment} /><TouchableOpacity onPress={addComment} disabled={commenting || !commentDraft.trim()} style={[styles.sendButton, { backgroundColor: colors.primary, opacity: commenting || !commentDraft.trim() ? 0.45 : 1 }]}><MaterialIcons name="send" size={20} color="#fff" /></TouchableOpacity></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!actionSheet} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setActionSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionSheet(null)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 18) }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetTitleRow}>
              <View style={[styles.sheetIcon, { backgroundColor: `${colors.primary}16` }]}><MaterialIcons name="tune" size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{actionSheet?.kind === "post" ? "إدارة المنشور" : "خيارات التعليق"}</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>اختر الإجراء المناسب</Text></View>
            </View>
            {actionSheet?.kind === "post" && actionSheet.post.authorId === currentUserId ? (
              <>
                <TouchableOpacity onPress={() => startEditingPost(actionSheet.post)} style={[styles.sheetOption, { borderColor: colors.border }]}><MaterialIcons name="edit" size={22} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.sheetOptionTitle, { color: colors.foreground }]}>تعديل المنشور</Text><Text style={[styles.sheetOptionText, { color: colors.muted }]}>تحديث النص المنشور</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { setDeleteTarget(actionSheet.post); setActionSheet(null); }} style={[styles.sheetOption, { borderColor: colors.border }]}><MaterialIcons name="delete-outline" size={22} color={colors.error} /><View style={{ flex: 1 }}><Text style={[styles.sheetOptionTitle, { color: colors.error }]}>حذف المنشور</Text><Text style={[styles.sheetOptionText, { color: colors.muted }]}>إخفاؤه من المجتمع نهائياً</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>
              </>
            ) : actionSheet?.kind === "comment" && actionSheet.comment.authorId === currentUserId ? (
              <TouchableOpacity onPress={() => startEditingComment(actionSheet.comment)} style={[styles.sheetOption, { borderColor: colors.border }]}><MaterialIcons name="edit" size={22} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.sheetOptionTitle, { color: colors.foreground }]}>تعديل التعليق</Text><Text style={[styles.sheetOptionText, { color: colors.muted }]}>صحح النص ثم احفظه</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => actionSheet && openReport({ kind: actionSheet.kind, id: actionSheet.kind === "post" ? actionSheet.post.id : actionSheet.comment.id })} style={[styles.sheetOption, { borderColor: colors.border }]}><MaterialIcons name="flag" size={22} color={colors.error} /><View style={{ flex: 1 }}><Text style={[styles.sheetOptionTitle, { color: colors.foreground }]}>إرسال بلاغ</Text><Text style={[styles.sheetOptionText, { color: colors.muted }]}>سيصل إلى فريق المراجعة</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setActionSheet(null)} style={[styles.sheetCancel, { backgroundColor: colors.surface }]}><Text style={{ color: colors.foreground, fontWeight: "800" }}>إلغاء</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!reportTarget} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setReportTarget(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => !reporting && setReportTarget(null)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 18) }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetTitleRow}><View style={[styles.sheetIcon, { backgroundColor: `${colors.error}12` }]}><MaterialIcons name="flag" size={22} color={colors.error} /></View><View style={{ flex: 1 }}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>الإبلاغ عن {reportTarget?.kind === "post" ? "المنشور" : "التعليق"}</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>اختر السبب الأقرب، وسيُراجع البلاغ في لوحة الإدارة.</Text></View></View>
            <View style={{ gap: 8, marginTop: 14 }}>
              {REPORT_REASONS.map((reason) => {
                const selected = reportReason === reason.value;
                return <TouchableOpacity key={reason.value} onPress={() => setReportReason(reason.value)} style={[styles.reportReason, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}10` : colors.surface }]}><MaterialIcons name={reason.icon} size={21} color={selected ? colors.primary : colors.muted} /><Text style={{ flex: 1, color: colors.foreground, fontWeight: selected ? "800" : "600", textAlign: "right" }}>{reason.value}</Text><MaterialIcons name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={selected ? colors.primary : colors.muted} /></TouchableOpacity>;
              })}
            </View>
            <TouchableOpacity onPress={submitReport} disabled={!reportReason || reporting} style={[styles.reportSubmit, { backgroundColor: colors.error, opacity: !reportReason || reporting ? 0.45 : 1 }]}><MaterialIcons name="send" size={19} color="#fff" /><Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{reporting ? "جارٍ الإرسال..." : "إرسال البلاغ"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setReportTarget(null)} disabled={reporting} style={[styles.sheetCancel, { backgroundColor: colors.surface }]}><Text style={{ color: colors.foreground, fontWeight: "800" }}>إلغاء</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.centerBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: colors.background }]}>
            <View style={[styles.confirmIcon, { backgroundColor: `${colors.error}12` }]}><MaterialIcons name="delete-outline" size={30} color={colors.error} /></View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>حذف المنشور؟</Text>
            <Text style={[styles.confirmText, { color: colors.muted }]}>سيختفي المنشور من المجتمع، ويمكنك النشر فوراً بعد حذفه.</Text>
            <TouchableOpacity onPress={confirmDeletePost} style={[styles.confirmDelete, { backgroundColor: colors.error }]}><Text style={{ color: "#fff", fontWeight: "800" }}>حذف المنشور</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteTarget(null)} style={[styles.confirmCancel, { borderColor: colors.border }]}><Text style={{ color: colors.foreground, fontWeight: "800" }}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 36, gap: 12 },
  title: { fontSize: 25, fontWeight: "800", textAlign: "right" },
  subtitle: { fontSize: 13, textAlign: "right", marginTop: 3, marginBottom: 14 },
  composer: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 18 },
  input: { minHeight: 72, fontSize: 15, textAlign: "right" },
  preview: { width: "100%", height: 190, borderRadius: 12, marginBottom: 10 },
  removeImage: { position: "absolute", top: 7, right: 7, width: 28, height: 28, backgroundColor: "#0009", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mediaActions: { flexDirection: "row", gap: 5 },
  iconButton: { padding: 8 },
  publishButton: { paddingHorizontal: 23, paddingVertical: 10, borderRadius: 12 },
  publishText: { color: "#fff", fontWeight: "800" },
  note: { fontSize: 11, textAlign: "right", marginTop: 6 },
  feedLabel: { fontSize: 17, fontWeight: "800", textAlign: "right", marginBottom: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 12 },
  authorRow: { flexDirection: "row-reverse", alignItems: "center" },
  avatar: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 9 },
  authorInfo: { flex: 1, alignItems: "flex-end" },
  author: { fontSize: 14, fontWeight: "800" },
  date: { fontSize: 11, marginTop: 1 },
  body: { fontSize: 15, lineHeight: 23, textAlign: "right", marginVertical: 12 },
  postImage: { width: "100%", height: 230, borderRadius: 14, marginBottom: 11 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: "row-reverse", gap: 24 },
  action: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 42, gap: 8 },
  emptyTitle: { fontWeight: "800", fontSize: 17 },
  emptyText: { fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0007" },
  modal: { height: "82%", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  modalHandle: { width: 42, height: 5, borderRadius: 3, alignSelf: "center", marginTop: 9 },
  modalHeader: { minHeight: 66, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontWeight: "800", fontSize: 18, textAlign: "right" },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  comments: { padding: 16, gap: 10, flexGrow: 1 },
  comment: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  commentHeader: { flexDirection: "row-reverse", alignItems: "center" },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  commentName: { fontSize: 13, fontWeight: "800", textAlign: "right" },
  commentDate: { fontSize: 10, marginTop: 2, textAlign: "right" },
  moreButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  commentBody: { fontSize: 14, lineHeight: 21, textAlign: "right", marginTop: 10 },
  commentActions: { flexDirection: "row-reverse", alignItems: "center", marginTop: 10 },
  commentLikeButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingVertical: 4 },
  editCommentInput: { minHeight: 78, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlign: "right", fontSize: 14 },
  editCommentActions: { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
  smallPrimaryButton: { minWidth: 86, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  smallPrimaryText: { color: "#fff", fontWeight: "800" },
  smallSecondaryButton: { minWidth: 78, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  noComments: { textAlign: "center", marginTop: 40 },
  commentComposer: { paddingTop: 12, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  commentInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, flex: 1, paddingHorizontal: 12, paddingVertical: 10, textAlign: "right" },
  sendButton: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  actionSheet: { marginHorizontal: 10, marginBottom: 10, borderRadius: 26, paddingHorizontal: 16, paddingTop: 10 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 15 },
  sheetTitleRow: { flexDirection: "row-reverse", alignItems: "center" },
  sheetIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginLeft: 11 },
  sheetTitle: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  sheetSubtitle: { fontSize: 12, marginTop: 3, textAlign: "right" },
  sheetOption: { minHeight: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, marginTop: 10, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  sheetOptionTitle: { fontSize: 15, fontWeight: "800", textAlign: "right" },
  sheetOptionText: { fontSize: 11, marginTop: 2, textAlign: "right" },
  sheetCancel: { marginTop: 12, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  reportReason: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  reportSubmit: { minHeight: 50, borderRadius: 14, marginTop: 15, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  centerBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0008", padding: 22 },
  confirmCard: { width: "100%", maxWidth: 420, borderRadius: 24, padding: 20, alignItems: "center" },
  confirmIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  confirmTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  confirmText: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7, marginBottom: 17 },
  confirmDelete: { width: "100%", minHeight: 49, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmCancel: { width: "100%", minHeight: 47, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 9 },
});

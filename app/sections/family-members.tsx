import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  I18nManager,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useUser, type HealthCondition } from "@/lib/user-context";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

I18nManager.forceRTL(true);

const HEALTH_LABELS: Record<HealthCondition, string> = {
  diabetes: "السكري",
  hypertension: "ضغط الدم",
  obesity: "السمنة",
  cholesterol: "الكوليسترول",
  none: "لا يعاني من شيء",
};

const HEALTH_CONDITIONS: HealthCondition[] = ["none", "diabetes", "hypertension", "obesity", "cholesterol"];

export default function FamilyMembersScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useUser();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHealth, setEditHealth] = useState<HealthCondition>("none");
  const [editAge, setEditAge] = useState("");

  const startEdit = (memberId: string) => {
    const member = profile.familyMembers.find((m) => m.id === memberId);
    if (member) {
      setEditingMemberId(memberId);
      setEditName(member.name);
      setEditHealth(member.healthCondition || "none");
      setEditAge(member.age || "");
    }
  };

  const saveEdit = async () => {
    if (!editingMemberId || !editName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الفرد");
      return;
    }

    await updateProfile({
      familyMembers: profile.familyMembers.map((m) =>
        m.id === editingMemberId
          ? { ...m, name: editName, healthCondition: editHealth, age: editAge }
          : m
      ),
    });

    setEditingMemberId(null);
  };

  const deleteMember = (memberId: string) => {
    Alert.alert(
      "حذف الفرد",
      "هل أنت متأكد من حذف هذا الفرد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await updateProfile({
              familyMembers: profile.familyMembers.filter((m) => m.id !== memberId),
            });
          },
        },
      ]
    );
  };

  const addNewMember = async () => {
    const newMember = {
      id: Date.now().toString(),
      name: `فرد جديد ${profile.familyMembers.length + 1}`,
      healthCondition: "none" as const,
      age: "",
    };
    await updateProfile({
      familyMembers: [...profile.familyMembers, newMember],
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground mb-2">👨‍👩‍👧‍👦 أفراد العائلة</Text>
          <Text className="text-base text-muted">
            إدارة أفراد العائلة وحالاتهم الصحية
          </Text>
        </View>

        {/* Add New Member Button */}
        <TouchableOpacity
          onPress={addNewMember}
          className="mx-5 mb-4 py-3 px-4 rounded-xl flex-row items-center justify-center"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          <MaterialIcons name="add" size={24} color={colors.primary} />
          <Text className="text-lg font-semibold ml-2" style={{ color: colors.primary }}>
            إضافة فرد جديد
          </Text>
        </TouchableOpacity>

        {/* Family Members List */}
        <View className="mx-5">
          {profile.familyMembers.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-lg text-muted">لا توجد أفراد عائلة مضافين بعد</Text>
            </View>
          ) : (
            profile.familyMembers.map((member) => (
              <View
                key={member.id}
                className="bg-surface rounded-2xl p-4 mb-3 border"
                style={{ borderColor: colors.border }}
              >
                {editingMemberId === member.id ? (
                  // Edit Mode
                  <View className="gap-3">
                    <View>
                      <Text className="text-sm text-muted mb-1">الاسم</Text>
                      <TextInput
                        value={editName}
                        onChangeText={setEditName}
                        className="px-3 py-2 rounded-lg text-base"
                        style={{
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          borderWidth: 1,
                          borderColor: colors.primary,
                        }}
                        placeholder="أدخل الاسم"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View>
                      <Text className="text-sm text-muted mb-1">العمر</Text>
                      <TextInput
                        value={editAge}
                        onChangeText={setEditAge}
                        className="px-3 py-2 rounded-lg text-base"
                        style={{
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                        placeholder="أدخل العمر (اختياري)"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                      />
                    </View>

                    <View>
                      <Text className="text-sm text-muted mb-2">الحالة الصحية</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {HEALTH_CONDITIONS.map((condition) => (
                          <TouchableOpacity
                            key={condition}
                            onPress={() => setEditHealth(condition)}
                            className="px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor:
                                editHealth === condition
                                  ? `${colors.primary}30`
                                  : colors.background,
                              borderWidth: 1,
                              borderColor:
                                editHealth === condition
                                  ? colors.primary
                                  : colors.border,
                            }}
                          >
                            <Text
                              className="text-sm font-medium"
                              style={{
                                color:
                                  editHealth === condition
                                    ? colors.primary
                                    : colors.foreground,
                              }}
                            >
                              {HEALTH_LABELS[condition]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View className="flex-row gap-2 pt-2">
                      <TouchableOpacity
                        onPress={saveEdit}
                        className="flex-1 py-2 rounded-lg items-center"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-base font-semibold text-background">حفظ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingMemberId(null)}
                        className="flex-1 py-2 rounded-lg items-center"
                        style={{ backgroundColor: colors.border }}
                      >
                        <Text className="text-base font-semibold text-foreground">إلغاء</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // View Mode
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-foreground mb-1">
                        {member.name}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-muted">
                          🩺 {HEALTH_LABELS[member.healthCondition || "none"]}
                        </Text>
                        {member.age && (
                          <Text className="text-sm text-muted">• العمر: {member.age}</Text>
                        )}
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => startEdit(member.id)}
                        className="p-2"
                      >
                        <MaterialIcons name="edit" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteMember(member.id)}
                        className="p-2"
                      >
                        <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

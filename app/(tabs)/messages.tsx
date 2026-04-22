import React from 'react';
import { View, Text } from 'react-native';

export default function MessagesScreen() {
    return (
        <View className="flex-1 bg-white items-center justify-center">
            <Text className="text-xl font-bold text-gray-800">Messages</Text>
            <Text className="text-gray-500 mt-2">Content goes here...</Text>
        </View>
    );
}

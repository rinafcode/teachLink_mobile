import zlib from 'zlib';

// Mock realistic real-time chat payload with deep metadata, attachments, profile info, and thread history (~5-10KB)
const mockChatPayload = {
  id: 'msg_9823748293749',
  channelId: 'chan_teachlink_react_native_general',
  sender: {
    id: 'user_89127391823',
    name: 'Sayan Sen',
    avatarUrl: 'https://images.teachlink.com/avatars/user_89127391823.png',
    role: 'instructor',
    badges: [
      'expert',
      'popular',
      'top_contributor',
      'mentor',
      'verified_educator',
      'community_leader',
    ],
    profile: {
      bio: 'Full stack developer and specialized instructor in mobile app architectures, React Native performance, and real-time synchronization systems.',
      institution: 'TeachLink Academy',
      verified: true,
      rating: 4.95,
      coursesCount: 12,
    },
  },
  content: {
    text: 'Hey everyone! I just finished uploading the new syllabus for the Advanced React Native course. It includes details on the custom socket.io connection, deep linking, and performance profiling. Please review it before our live QA session tomorrow at 10 AM EST.',
    richText:
      '<p>Hey everyone! I just finished uploading the new syllabus for the <strong>Advanced React Native</strong> course. It includes details on the custom socket.io connection, deep linking, and performance profiling. Please review it before our live QA session tomorrow at 10 AM EST.</p>',
    mentions: ['@all', '@students', '@moderators', '@mentors'],
    attachments: [
      {
        id: 'att_129837',
        type: 'pdf',
        name: 'Advanced_React_Native_Syllabus.pdf',
        url: 'https://api.teachlink.com/storage/docs/Advanced_React_Native_Syllabus.pdf',
        size: 5242880,
        uploadedAt: '2026-05-27T22:45:00.000Z',
        checksum: 'sha256-df8203f8c823f908e390c8a82d8c32d98c9f0028e37894d',
      },
      {
        id: 'att_129838',
        type: 'image',
        name: 'architecture_diagram.png',
        url: 'https://api.teachlink.com/storage/images/architecture_diagram.png',
        size: 2048576,
        uploadedAt: '2026-05-27T22:46:12.000Z',
        checksum: 'sha256-a083f98c8c23f908e390c8a82d8c32d98c9f0028e37894a',
      },
    ],
  },
  threadContext: {
    originalMessageId: 'msg_9823748290000',
    repliesCount: 12,
    recentReplies: [
      {
        id: 'reply_1',
        senderId: 'user_091823',
        text: 'Thanks Sayan! Will check it out tonight.',
        timestamp: '2026-05-27T22:47:00.000Z',
      },
      {
        id: 'reply_2',
        senderId: 'user_102938',
        text: 'Is there any prerequisite reading for the socket.io part?',
        timestamp: '2026-05-27T22:47:30.000Z',
      },
      {
        id: 'reply_3',
        senderId: 'user_89127391823',
        text: 'Yes, check Module 3 lesson 2 on RFC 6455 WebSockets.',
        timestamp: '2026-05-27T22:48:00.000Z',
      },
      {
        id: 'reply_4',
        senderId: 'user_119283',
        text: 'Perfect, looking forward to the QA tomorrow!',
        timestamp: '2026-05-27T22:48:45.000Z',
      },
      {
        id: 'reply_5',
        senderId: 'user_120938',
        text: 'Same here, the custom socket stuff is extremely interesting.',
        timestamp: '2026-05-27T22:49:00.000Z',
      },
      {
        id: 'reply_6',
        senderId: 'user_139482',
        text: 'Will there be a recording of the session? I might miss the first 10 minutes.',
        timestamp: '2026-05-27T22:49:15.000Z',
      },
      {
        id: 'reply_7',
        senderId: 'user_89127391823',
        text: 'Yes, all live sessions are recorded and uploaded to the course viewer within an hour.',
        timestamp: '2026-05-27T22:49:30.000Z',
      },
      {
        id: 'reply_8',
        senderId: 'user_139482',
        text: 'Awesome, thank you!',
        timestamp: '2026-05-27T22:49:40.000Z',
      },
      {
        id: 'reply_9',
        senderId: 'user_149283',
        text: 'I read through the deep linking syllabus, it looks very comprehensive.',
        timestamp: '2026-05-27T22:50:00.000Z',
      },
      {
        id: 'reply_10',
        senderId: 'user_159283',
        text: 'Is there any discussion on push notification payload sizes?',
        timestamp: '2026-05-27T22:50:20.000Z',
      },
      {
        id: 'reply_11',
        senderId: 'user_89127391823',
        text: 'Yes, covered in Module 4 under push notifications optimization.',
        timestamp: '2026-05-27T22:50:40.000Z',
      },
      {
        id: 'reply_12',
        senderId: 'user_159283',
        text: 'Fantastic, exactly what I was hoping for.',
        timestamp: '2026-05-27T22:51:00.000Z',
      },
    ],
  },
  metadata: {
    device: 'iOS 18.2 (iPhone 16 Pro)',
    network: '5G',
    clientVersion: '1.0.4',
    deliveredAt: '2026-05-27T22:49:22.000Z',
    readBy: [
      { userId: 'user_091823', readAt: '2026-05-27T22:50:01.000Z', name: 'Alice Smith' },
      { userId: 'user_102938', readAt: '2026-05-27T22:50:05.000Z', name: 'Bob Johnson' },
      { userId: 'user_119283', readAt: '2026-05-27T22:50:12.000Z', name: 'Charlie Brown' },
      { userId: 'user_120938', readAt: '2026-05-27T22:50:15.000Z', name: 'David Lee' },
      { userId: 'user_139482', readAt: '2026-05-27T22:50:20.000Z', name: 'Emma Watson' },
    ],
    analytics: {
      sessionDuration: 345,
      messagesSentInSession: 14,
      connectionType: 'websocket',
      transportLatencyMs: 42,
    },
  },
  timestamp: '2026-05-27T22:49:22.000Z',
};

// Larger batch course updates payload (5-10KB)
const mockCourseBatchPayload = {
  courseId: 'course_react_native_architecture',
  title: 'Advanced React Native & Architecture',
  instructor: 'Sayan Sen',
  lastUpdated: '2026-05-27T22:49:22.000Z',
  modules: Array.from({ length: 5 }).map((_, i) => ({
    id: `mod_${i}`,
    title: `Module ${i + 1}: Deep Dive into Real-time Architectures`,
    duration: 120 + i * 30,
    lessons: [
      { id: `les_${i}_1`, title: 'Introduction to WebSockets & RFC 6455 Protocol', free: true },
      { id: `les_${i}_2`, title: 'Socket.IO Handshakes and Connection Lifecycles', free: false },
      { id: `les_${i}_3`, title: 'Performance Profiling, Jitter, & Thundering Herds', free: false },
      {
        id: `les_${i}_4`,
        title: 'Built-in Deflate vs Custom Application Compression',
        free: false,
      },
    ],
    quiz: {
      id: `quiz_${i}`,
      questionsCount: 15,
      passingScore: 80,
    },
  })),
};

describe('WebSocket Transport Deflate Compression Benchmarking Suite', () => {
  it('verifies zlib deflate compression ratio and correctness on chat payload', () => {
    const rawJSON = JSON.stringify(mockChatPayload);
    const rawSize = Buffer.byteLength(rawJSON, 'utf8');

    // Perform transport-level deflate compression
    const startComp = performance.now();
    const compressedBuffer = zlib.deflateSync(rawJSON, {
      level: zlib.constants.Z_DEFAULT_COMPRESSION,
    });
    const endComp = performance.now();

    const compressedSize = compressedBuffer.byteLength;
    const compressionRatio = ((rawSize - compressedSize) / rawSize) * 100;
    const cpuCompTime = endComp - startComp;

    // Decompression verification
    const startDecomp = performance.now();
    const decompressedBuffer = zlib.inflateSync(compressedBuffer);
    const endDecomp = performance.now();

    const decompressedJSON = decompressedBuffer.toString('utf8');
    const parsedPayload = JSON.parse(decompressedJSON);
    const cpuDecompTime = endDecomp - startDecomp;

    // Output stats
    console.log(`\n=================== CHAT MESSAGE BENCHMARK ===================`);
    console.log(
      `Original JSON Payload Size:   ${(rawSize / 1024).toFixed(2)} KB (${rawSize} bytes)`
    );
    console.log(
      `Deflated Frame Wire Size:     ${(compressedSize / 1024).toFixed(2)} KB (${compressedSize} bytes)`
    );
    console.log(`Bandwidth Reduction Ratio:    ${compressionRatio.toFixed(2)}%`);
    console.log(`JS CPU Compression Latency:   ${cpuCompTime.toFixed(4)} ms`);
    console.log(`JS CPU Decompression Latency: ${cpuDecompTime.toFixed(4)} ms`);
    console.log(`================================================================`);

    // Assertions
    expect(compressionRatio).toBeGreaterThanOrEqual(60.0); // Verifies high efficiency (>60% reduction on small detailed chat payloads)
    expect(parsedPayload.id).toBe(mockChatPayload.id);
    expect(parsedPayload.sender.name).toBe(mockChatPayload.sender.name);
    expect(parsedPayload.content.attachments.length).toBe(
      mockChatPayload.content.attachments.length
    );
  });

  it('verifies zlib deflate compression ratio and correctness on large batch course payload', () => {
    const rawJSON = JSON.stringify(mockCourseBatchPayload);
    const rawSize = Buffer.byteLength(rawJSON, 'utf8');

    // Perform transport-level deflate compression
    const startComp = performance.now();
    const compressedBuffer = zlib.deflateSync(rawJSON, {
      level: zlib.constants.Z_DEFAULT_COMPRESSION,
    });
    const endComp = performance.now();

    const compressedSize = compressedBuffer.byteLength;
    const compressionRatio = ((rawSize - compressedSize) / rawSize) * 100;
    const cpuCompTime = endComp - startComp;

    // Decompression verification
    const startDecomp = performance.now();
    const decompressedBuffer = zlib.inflateSync(compressedBuffer);
    const endDecomp = performance.now();

    const decompressedJSON = decompressedBuffer.toString('utf8');
    const parsedPayload = JSON.parse(decompressedJSON);
    const cpuDecompTime = endDecomp - startDecomp;

    // Output stats
    console.log(`\n=================== BATCH COURSE BENCHMARK ===================`);
    console.log(
      `Original JSON Payload Size:   ${(rawSize / 1024).toFixed(2)} KB (${rawSize} bytes)`
    );
    console.log(
      `Deflated Frame Wire Size:     ${(compressedSize / 1024).toFixed(2)} KB (${compressedSize} bytes)`
    );
    console.log(`Bandwidth Reduction Ratio:    ${compressionRatio.toFixed(2)}%`);
    console.log(`JS CPU Compression Latency:   ${cpuCompTime.toFixed(4)} ms`);
    console.log(`JS CPU Decompression Latency: ${cpuDecompTime.toFixed(4)} ms`);
    console.log(`================================================================\n`);

    // Assertions
    expect(compressionRatio).toBeGreaterThanOrEqual(80.0); // Verifies high efficiency (>80% reduction on highly repetitive large batch payloads)
    expect(parsedPayload.courseId).toBe(mockCourseBatchPayload.courseId);
    expect(parsedPayload.modules.length).toBe(mockCourseBatchPayload.modules.length);
  });
});

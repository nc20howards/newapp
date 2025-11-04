// types.ts

// --- User & Auth Types ---
export type SchoolUserRole = 'student' | 'teacher' | 'head_of_department' | 'canteen_seller' | 'deputy_headteacher' | 'parent' | 'old_student';

export interface User {
  name: string;
  studentId: string;
  class?: string;
  stream?: string;
  schoolId?: string;
  role: 'student' | 'superadmin' | SchoolUserRole;
  password?: string;
  avatarUrl?: string;
  contactNumber?: string;
  email?: string;
  bio?: string;
  mustChangePassword?: boolean;
  dateOfBirth?: string;
  address?: string;
  shopId?: string; // For canteen_seller
  unebPassSlip?: UnebPassSlip; // To store verified results
  internalExams?: InternalExamResult[];
  accountStatus?: 'temporary' | 'active' | 'disabled';
  pendingTransferAcceptance?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'headteacher' | 'uneb_admin' | 'nche_admin';
  assignedSchoolIds: string[];
  password: string;
  avatarUrl?: string;
  contactNumber?: string;
  bio?: string;
  lastLogin?: number;
  address?: string;
}


// --- School & Module Types ---
export interface School {
  id: string;
  name: string;
  address: string;
  modules: { moduleId: string; status: 'assigned' | 'active' | 'published' }[];
  isHomePagePublished?: boolean;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  isAssignable: boolean;
}

// --- Smart Admission & UNEB Types ---
export interface ExtractedUnebSlipData {
    yearAndLevel: string;
    studentName: string;
    indexNumber: string;
    schoolName: string;
    schoolAddress: string;
    entryCode: string;
    dateOfBirth: string;
    subjects: { name: string; grade: string }[];
    aggregate: string;
    result: string;
}

export interface UnebPassSlip {
  indexNo: string;
  name: string;
  year: string;
  level: 'P.L.E' | 'U.C.E' | 'U.A.C.E';
  subjects: { name: string; grade: string }[];
  dateOfBirth?: string;
  schoolName?: string;
  schoolAddress?: string;
  entryCode?: string;
  aggregate?: string;
  result?: string;
}

export interface UnebStats {
    totalSlips: number;
    uniqueSchools: number;
    byLevel: {
        'P.L.E': { studentCount: number; years: string[] };
        'U.C.E': { studentCount: number; years: string[] };
        'U.A.C.E': { studentCount: number; years: string[] };
    };
}

export interface SchoolALevelCombination {
  id: string;
  name: string; // e.g., "PCM"
  subjects: string; // e.g., "Physics, Chemistry, Mathematics"
}

export interface ALevelCombinationSettings {
  arts: SchoolALevelCombination[];
  sciences: SchoolALevelCombination[];
}

export interface AdmissionSettings {
    schoolId: string;
    automaticAdmission: boolean;
    defaultClass: string;
    studentIdPrefix: string;
    admissionFee: number;
    acceptingClasses: string[];
    startDate: string;
    endDate: string;
    aLevelCombinations: ALevelCombinationSettings;
}

export interface CompletedAdmission {
    id: string;
    applicantId: string; // The User ID of the student who applied OR their index number if new
    data: UnebPassSlip | ExtractedUnebSlipData;
    status: 'under_review' | 'approved' | 'rejected' | 'transferred';
    timestamp: number;
    targetClass: string;
    aLevelCombinationGroup?: 'arts' | 'sciences';
    aLevelCombinationChoice?: string;
    transferToSchoolId?: string;
    transferStatus?: 'pending_student_approval' | 'accepted_by_student' | 'rejected_by_student';
}

// --- E-Wallet Types ---
export type TransactionType = 'top-up' | 'payment' | 'withdrawal' | 'fee_payment' | 'admission_fee_payment' | 'disbursement' | 'allowance' | 'bursary_credit' | 'service_fee_credit' | 'transfer_fee_payment';
export type TopUpMethod = 'mobile_money' | 'card' | 'bank_transfer' | 'system_credit';
export type WithdrawalMethod = 'mobile_money' | 'bank_transfer';

export interface EWallet {
  userId: string;
  balance: number;
  currency: 'UGX';
  pin?: string; // Should be hashed in a real app
}

export interface EWalletTransaction {
  id: string;
  walletUserId: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  recipient?: string;
  method?: TopUpMethod | 'e-wallet';
  feeId?: string;
  orderId?: string;
  negotiationId?: string;
}

export interface SchoolFee {
    id: string;
    schoolId: string;
    title: string;
    description: string;
    amount: number;
    dueDate: number;
    payments: { [studentId: string]: { transactionId: string, paidAt: number } };
}

export interface ParentalControlSettings {
    userId: string;
    dailySpendingLimit?: number;
    weeklySpendingLimit?: number;
    blockedMerchants?: string[];
}

export interface PinResetRequest {
    id: string;
    userId: string;
    userName: string;
    schoolId?: string;
    userRole: User['role'] | AdminUser['role'];
    timestamp: number;
    status: 'pending' | 'completed';
}


// --- Social Hub, Groups, Messages ---
export interface Group {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl?: string;
  adminId: string;
  memberIds: string[];
  settings: {
    onlyAdminsCanMessage: boolean;
  };
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string; // This string will now contain rich HTML content
  timestamp: number;
  reactions: Record<string, string[]>;
  replyTo?: {
    messageId: string;
    authorName: string;
    content: string;
  };
  isDeleted?: boolean;
  views?: number;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  content?: string;
  timestamp: number;
  expiresAt: number;
  reactions: Record<string, string[]>;
}

export interface ChatConversation {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastMessageTimestamp: number;
  lastMessageSenderId?: string;
  unreadCount: { [userId: string]: number };
}

export interface ChatAttachment {
    name: string;
    type: 'image' | 'video' | 'file';
    dataUrl: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  attachments?: ChatAttachment[];
  timestamp: number;
  isSent: boolean;
  readBy?: string[];
  reactions?: Record<string, string[]>;
  replyTo?: {
    messageId: string;
    authorName: string;
    content: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedFor?: string[];
  scheduledSendTime?: number;
}

export interface BroadcastChannel {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  adminIds: string[];
}

export interface BroadcastMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
}

// --- General & System ---
export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface AuditLogEntry {
    id: string;
    timestamp: number;
    userId: string;
    userName: string;
    action: string;
    details: Record<string, any>;
    ipAddress: string;
}

export interface ConversationEntry {
  id: number | string;
  userQuery: string;
  aiResponse: string;
  timestamp: Date;
  feedback: 'up' | 'down' | null;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  name: string;
  level: 'O-Level' | 'A-Level';
  streams: string[];
}


// --- Home Page Editor ---
export interface HomePageContent {
    schoolId: string;
    hero: {
        logoUrl: string;
        backgroundType: 'single_image' | 'slider';
        imageUrl: string;
        sliderImages: { id: string; url: string }[];
        title: string;
        subtitle: string;
        buttonText: string;
        marquee: {
            enabled: boolean;
            text: string;
        };
        headerBackgroundColor?: string;
        headerTextColor?: string;
    };
    welcome: {
        title: string;
        mainText: string;
        director: {
            imageUrl: string;
            name: string;
            title: string;
            quote: string;
        };
        coreValues: string[];
    };
    whyChooseUs: {
        title: string;
        items: { id: string; title: string; description: string }[];
    };
    campuses: {
        title: string;
        items: { id: string; imageUrl: string; name: string; description: string }[];
    };
    news: {
        title: string;
        items: { id: string; imageUrl: string; title: string; date: string; excerpt: string }[];
    };
}

// --- Smart ID Card ---
export interface CustomIdField {
    id: string;
    label: string;
    userProperty: keyof User;
}

export interface SmartIDSettings {
    schoolId: string;
    primaryColor: string;
    textColor: string;
    customFields: CustomIdField[];
    templateType: 'default' | 'custom';
}

export interface TemplateField {
  id: string;
  type: 'text' | 'photo' | 'qrcode' | 'static-text';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  userProperty?: keyof User;
  label?: string; // for static text or as a fallback
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

export interface CustomIdTemplate {
  schoolId: string;
  frontBackground: string;
  backBackground: string;
  fields: TemplateField[];
}

// --- E-Canteen ---
export type PaymentMethod = 'e_wallet' | 'rfid' | 'nfc' | 'barcode';

export interface CanteenSettings {
  schoolId: string;
  activePaymentMethod: PaymentMethod;
}

export interface CanteenMenuItem {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

export interface CanteenCategory {
  id: string;
  shopId: string;
  name: string;
  itemCount: number;
}

export interface CanteenShop {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  ownerId?: string; // userId of the canteen_seller
}

export interface CanteenOrder {
  id: string;
  shopId: string;
  studentId: string;
  studentName: string;
  items: { itemId: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  timestamp: number;
  transactionId?: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryDetails?: string;
}

export interface DecodedQrOrder {
    studentId: string;
    studentName: string; // This will be added after decoding from studentId
    shopId: string;
    totalAmount: number;
    cartItems: { itemId: string, name: string; quantity: number, price: number }[];
}

export interface Receipt {
    id: string;
    transactionId: string;
    orderId: string;
    userId: string; // The owner of this receipt
    timestamp: number;
    type: 'purchase' | 'sale';
    amount: number;
    description: string;
    partyName: string; // The other person/entity in the transaction
    items: { name: string; quantity: number; price: number }[];
}

// --- System Security ---
export interface IpWhitelistSettings {
    enabled: boolean;
    allowedIps: string[];
    vpnAllowed: boolean;
}

// --- NCHE (Higher Education) Types ---
export interface HigherEducationInstitution {
  id: string;
  name: string;
  acronym: string;
  type: 'University' | 'Tertiary Institution' | 'Other';
  ownership: 'Public' | 'Private';
  logoUrl: string;
}

export interface ProgramRequirement {
    principalPasses: number; // e.g., 2
    subsidiaryPasses: number; // e.g., 1 from General Paper
    essentialSubjects?: { name: string; minGrade: string }[]; // e.g., { name: 'Mathematics', minGrade: 'C' }
    relevantSubjects?: { name: string; minGrade: string }[];
    desirableSubjects?: { name: string; minGrade: string }[];
    minPoints?: number;
    uceRequirements?: string; // e.g., "5 credits including English and Mathematics"
}

export interface Program {
  id: string;
  institutionId: string;
  ncheCode: string; // Official NCHE code for the program
  name: string;
  faculty: string;
  durationYears: number;
  level: 'Certificate' | 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';
  requirements: ProgramRequirement;
  estimatedFees?: number;
  careerProspects?: string[];
}

export interface SubjectPerformance {
  name: string;
  score: number; // Percentage score
  grade: string;
}

export interface InternalExamResult {
  term: string; // e.g., "Term 1, 2024"
  subjects: SubjectPerformance[];
  average: number;
  classPosition: string; // e.g., "3rd out of 45"
}

export interface ALevelCombination {
  code: string;
  name: string;
  subjects: string[];
  description: string;
  careerProspects: string[];
}

export interface OLevelGuidance {
  topSubjects: SubjectPerformance[] | { name: string; grade: string }[];
  combinationSuggestions: ALevelCombination[];
  tertiarySuggestions: Program[];
}

// --- Exploration Module ---
export interface ExplorationItem {
  id: string;
  title: string;
  subject: string;
  description: string;
  modelUrl: string; // URL to the .glb/.gltf file
  thumbnailUrl?: string;
}

// --- Student Transfer Marketplace ---
export interface StudentTransferProposal {
  id: string;
  proposingSchoolId: string;
  proposingSchoolName: string;
  numberOfStudents: number;
  gender: 'Male' | 'Female' | 'Mixed';
  grade: string;
  description: string;
  status: 'open' | 'closed';
  timestamp: number;
  pricePerStudent: number;
  deadline: number; // timestamp
}

export interface TransferNegotiation {
  id: string; // proposalId_interestedSchoolId
  proposalId: string;
  proposingSchoolId: string;
  interestedSchoolId: string;
  messages: {
    senderId: string; // headteacher user id
    senderName: string;
    content: string;
    timestamp: number;
  }[];
  status: 'active' | 'accepted' | 'payment_made' | 'completed' | 'rejected';
  lastUpdated: number;
  assignedStudents?: { studentId: string; studentName: string; }[];
  totalPrice?: number;
}


export interface Place {
  title: string;
  uri: string;
}


export interface MarketplaceMedia {
    type: 'image' | 'video';
    url: string;
}

export interface MarketplaceListing {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerAvatar?: string;
    title: string;
    description: string;
    price: number;
    category: 'Electronics' | 'Clothing' | 'Books' | 'Furniture' | 'Services' | 'Other';
    condition: 'new' | 'used';
    location: string;
    media: MarketplaceMedia[];
    createdAt: number;
    status: 'available' | 'sold' | 'pending';
}

export interface Event {
    id: string;
    schoolId: string;
    createdBy: string; // userId of creator
    title: string;
    description: string;
    startTime: number; // timestamp
    endTime: number; // timestamp
    bannerUrl: string;
    logoUrl: string;
    place: Place;
    createdAt: number;
    attachments?: ChatAttachment[];
}


// --- E-Vote Module ---
export interface ElectionSettings {
  schoolId: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  isVotingOpen: boolean;
}

export interface VotingCategory {
  id: string;
  schoolId: string;
  title: string;
  order: number;
}

export interface Contestant {
  id: string;
  schoolId: string;
  categoryId: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
  class: string;
  manifesto: string;
  votes: number;
}

export interface VoteRecord {
  studentId: string;
  schoolId: string;
  timestamp: number;
  choices: Record<string, string>; // { [categoryId]: contestantId }
}

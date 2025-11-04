// services/topicService.ts

const TOPICS_KEY = '360_smart_school_topics';

const getTopicsData = (): Record<string, string[]> => {
    const data = localStorage.getItem(TOPICS_KEY);
    return data ? JSON.parse(data) : {};
};

const saveTopicsData = (data: Record<string, string[]>) => {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(data));
};

export const getTopicsForSchool = (schoolId: string): string[] => {
    const data = getTopicsData();
    return data[schoolId] || [];
};

export const saveTopicsForSchool = (schoolId: string, topics: string[]): void => {
    const data = getTopicsData();
    data[schoolId] = topics;
    saveTopicsData(data);
};

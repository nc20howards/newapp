
import React from 'react';
import { School } from '../types';
import { getHomePageContent } from '../services/homePageService';
import HomePagePreview from './HomePagePreview';

interface SchoolLandingPageProps {
    school: School;
    onProceed?: () => void;
    proceedButtonText?: string;
    isNewUserFlow?: boolean;
    onBackToSelection?: () => void;
    onShowAdmission?: () => void;
}

const SchoolLandingPage: React.FC<SchoolLandingPageProps> = (props) => {
    const content = getHomePageContent(props.school.id);

    return (
        <HomePagePreview
            content={content}
            onProceedToPortal={props.onProceed}
            proceedButtonText={props.proceedButtonText}
            isNewUserFlow={props.isNewUserFlow}
            onBackClick={props.onBackToSelection}
            onAdmissionClick={props.onShowAdmission}
        />
    );
};

export default SchoolLandingPage;

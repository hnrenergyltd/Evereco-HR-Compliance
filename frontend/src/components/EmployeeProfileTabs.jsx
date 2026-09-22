import { useState, useRef } from 'react';
import './EmployeeProfileTabs.css';
import OverviewTab from './tabs/OverviewTab';
import EmploymentTab from './tabs/EmploymentTab';
import PersonalTab from './tabs/PersonalTab';
import SensitiveInformationTab from './tabs/SensitiveInformationTab';
import EmergencyContactsTab from './tabs/EmergencyContactsTab';
import AttendanceTab from './tabs/AttendanceTab';
import AbsenceTab from './tabs/AbsenceTab';
import DocumentsTab from './tabs/DocumentsTab';
import SponsorshipTab from './tabs/SponsorshipTab';

function EmployeeProfileTabs({
  employee,
  currentUser,
  isReadOnly = false,
  onShowDeleteModal = () => {},
  showDeleteModal = false,
  isDeleting = false,
  onDeleteConfirm = () => {},
  onDeleteCancel = () => {}
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const tabsContainerRef = useRef(null);

  const tabs = [
    { id: 'overview', label: 'Overview', component: OverviewTab },
    { id: 'employment', label: 'Employment', component: EmploymentTab },
    { id: 'personal', label: 'Personal', component: PersonalTab },
    { id: 'sensitive', label: 'Sensitive Info', component: SensitiveInformationTab },
    { id: 'emergency', label: 'Emergency Contacts', component: EmergencyContactsTab },
    { id: 'attendance', label: 'Attendance', component: AttendanceTab },
    { id: 'absence', label: 'Absence', component: AbsenceTab },
    { id: 'documents', label: 'Documents', component: DocumentsTab },
    { id: 'sponsorship', label: 'Sponsorship', component: SponsorshipTab },
  ];

  const ActiveTabComponent = tabs.find(t => t.id === activeTab)?.component || OverviewTab;

  const scrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      if (direction === 'left') {
        tabsContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div>
      {/* Tab Navigation Bar with Arrow Buttons */}
      <div className="tabs-wrapper">
        <button className="tab-scroll-btn tab-scroll-left" onClick={() => scrollTabs('left')} aria-label="Scroll tabs left">
          ‹
        </button>

        <div className="tabs" ref={tabsContainerRef}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button className="tab-scroll-btn tab-scroll-right" onClick={() => scrollTabs('right')} aria-label="Scroll tabs right">
          ›
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <ActiveTabComponent
          employee={employee}
          currentUser={currentUser}
          isReadOnly={isReadOnly}
          activeTab={activeTab}
          onShowDeleteModal={onShowDeleteModal}
          showDeleteModal={showDeleteModal}
          isDeleting={isDeleting}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
        />
      </div>
    </div>
  );
}

export default EmployeeProfileTabs;

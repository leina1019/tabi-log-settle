import { useState } from 'react';
import { UserProfile } from '../types';

export const useMemberFilter = (userProfiles: UserProfile[]) => {
    const [showOverall, setShowOverall] = useState<boolean>(true);
    const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(() =>
        userProfiles.map((u) => u.id)
    );

    const toggleMember = (id: string) => {
        setVisibleMemberIds((prev) =>
            prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
        );
    };

    return {
        showOverall,
        setShowOverall,
        visibleMemberIds,
        setVisibleMemberIds,
        toggleMember,
    };
};

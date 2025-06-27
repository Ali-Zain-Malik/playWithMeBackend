const notificationTypes = [
    {
        "notification_id": 1,
        "type": "activity_request",
        "message": "%s has requested to join %s",
    },
    {
        "notification_id": 2,
        "type": "activity_accepted",
        "message": "%s has accepted your join request for %s",
    },
    {
        "notification_id": 3,
        "type": "friend_follow",
        "message": "%s is now following you",
    },
    {
        "notification_id": 4,
        "type": "activity_rejected",
        "message": "%s has rejected your request for %s",
    },
    {
        "notification_id": 5,
        "type": "activity_cancelled",
        "message": "%s has cancelled request for %s",
    },
    {
        "notification_id": 6,
        "type": "message",
        "message": "%s has sent you a message",
    },
    {
        "notification_id": 7,
        "type": "activity_new",
        "message": "%s has created a new activity",
    }
];

export default notificationTypes;